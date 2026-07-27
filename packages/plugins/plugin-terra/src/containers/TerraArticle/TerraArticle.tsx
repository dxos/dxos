//
// Copyright 2026 DXOS.org
//

import { type Observer } from '@babylonjs/core/Misc/observable';
import { type Scene } from '@babylonjs/core/scene';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { TelemetryPanel, type TelemetryRow, TerraForm } from '#components';
import { meta } from '#meta';
import { Terra, TerraObject } from '#types';

import { SceneFpsWidget, SceneManager, type TerraConfigValues, generatePlanet, seaRadius } from '../../engine';
import { GizmoLayer, ObjectLayer, TrailLayer } from '../../scene';
import { SimEngine, type SimObject, buildNavGrid, toGeo } from '../../sim';

/** Tracks pause state for the render-loop clock: while paused, `pausedAtMs` freezes the sim time; on resume, the elapsed pause duration is folded into `pausedTotalMs` so the clock continues from where it froze rather than jumping ahead. */
type SimClock = { pausedTotalMs: number; pausedAtMs: number | null };

export type TerraArticleProps = AppSurface.ObjectArticleProps<Terra.Terra>;

/** Resolves `terra.objects` (an array of refs) to their loaded definitions. */
const resolveDefinitions = (terra: Terra.Terra): TerraObject.TerraObject[] =>
  terra.objects
    .map((ref) => ref.target)
    .filter((definition): definition is TerraObject.TerraObject => definition != null);

/** A `SimEngine` over `definitions`, with a nav grid freshly built for `values` — the grid depends on the seed. */
const buildSimEngine = (values: TerraConfigValues, definitions: readonly TerraObject.TerraObject[]): SimEngine =>
  new SimEngine({ config: values, definitions, grid: buildNavGrid(values) });

/**
 * Samples the telemetry panel at a modest rate rather than every sim frame (60fps) — the panel is
 * for a human to read, and re-rendering React that often would both thrash the DOM for no visual
 * benefit and contend with the render loop for the main thread. ~6.6Hz sits in the middle of the
 * requested 4–10Hz band.
 */
const TELEMETRY_SAMPLE_INTERVAL_MS = 150;

const RAD_TO_DEG = 180 / Math.PI;

/** `objects`' current state as telemetry rows: lat/lng from `state.unit`, height as a percentage above the sea surface (not the raw, otherwise-meaningless radius), and speed converted from `TerraObject.speed`'s radians/sim-second to the more legible degrees/sec. */
const buildTelemetry = (objects: readonly SimObject[], config: TerraConfigValues): TelemetryRow[] =>
  objects.map(({ definition, state }) => {
    const { lat, lng } = toGeo(state.unit);
    const sea = seaRadius(config);
    return {
      id: definition.id,
      kind: definition.kind,
      name: definition.name ?? definition.kind,
      lat,
      lng,
      heightPercent: ((state.radius - sea) / sea) * 100,
      heading: state.bearing,
      speedDegPerSec: definition.speed * RAD_TO_DEG,
    };
  });

export const TerraArticle = ({ role, attendableId, subject: terra }: TerraArticleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const objectLayerRef = useRef<ObjectLayer | null>(null);
  const trailLayerRef = useRef<TrailLayer | null>(null);
  // Set/cleared only by the gizmo-toggle effect below, but read fresh each frame by the mount-once
  // render-loop observer — mirrors `simEngineRef`'s ref-for-freshness pattern, since the layer's own
  // lifetime (created/disposed on toggle) is independent of the observer's (mount-once).
  const gizmoLayerRef = useRef<GizmoLayer | null>(null);
  const simEngineRef = useRef<SimEngine | null>(null);
  // The config `simEngineRef`'s current engine was built with — kept in lockstep with it (set
  // wherever `simEngineRef.current` is) so trail sampling always re-evaluates motion under the same
  // config its states' `route`/`leg`/`legStart` were produced under.
  const configRef = useRef<TerraConfigValues | null>(null);
  // Mutated directly by `handleTogglePlaying` and read fresh each frame by the mount-once render-loop
  // observer below — mirrors `simEngineRef`'s ref-for-freshness pattern so the closure never goes stale.
  const clockRef = useRef<SimClock>({ pausedTotalMs: 0, pausedAtMs: null });
  // Wall-clock instant the telemetry panel was last sampled at, so the render-loop observer (which
  // runs every frame) only calls `setTelemetry` at `TELEMETRY_SAMPLE_INTERVAL_MS`, not 60 times a second.
  const telemetrySampleRef = useRef(0);
  const [config, updateConfig] = useObject(terra, 'config');
  const [objectRefs] = useObject(terra, 'objects');
  const [isPlaying, setIsPlaying] = useState(true);
  const [gizmosVisible, setGizmosVisible] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);

  const values = useMemo(() => Terra.toConfigValues(terra), [config, terra]);
  const definitions = useMemo(() => resolveDefinitions(terra), [terra, objectRefs]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const manager = new SceneManager(canvasRef.current);
    managerRef.current = manager;

    const fps = new SceneFpsWidget({ scene: manager.scene, engine: manager.engine });

    const layer = new ObjectLayer({ scene: manager.scene });
    objectLayerRef.current = layer;
    const trails = new TrailLayer({ scene: manager.scene });
    trailLayerRef.current = trails;
    const initialValues = Terra.toConfigValues(terra);
    simEngineRef.current = buildSimEngine(initialValues, resolveDefinitions(terra));
    configRef.current = initialValues;

    const observer: Observer<Scene> = manager.scene.onBeforeRenderObservable.add(() => {
      const engine = simEngineRef.current;
      const engineConfig = configRef.current;
      if (!engine || !engineConfig) {
        return;
      }
      // Always an absolute time, whether running or paused, so the engine stays closed-form: while
      // paused, `pausedAtMs` is frozen and `pausedTotalMs` is unchanged, so this yields the same
      // instant every frame; on resume, `pausedTotalMs` absorbs the pause duration so the clock
      // continues from that frozen instant rather than jumping ahead.
      const clock = clockRef.current;
      const nowMs = (clock.pausedAtMs ?? performance.now()) - clock.pausedTotalMs;
      engine.evaluateAt(nowMs);
      // Real (wall-clock) frame delta, not the pause-adjusted sim clock — turn easing is a
      // rendering concern independent of whether the sim is paused.
      const deltaMs = manager.engine.getDeltaTime();
      layer.update(engine.objects, deltaMs);
      // Shares the same pause-adjusted clock as the sim, so trails freeze in place with everything else.
      trails.update(engine.objects, engineConfig, nowMs);
      // Read fresh each frame: the layer itself is created/disposed by the toggle effect, not here.
      gizmoLayerRef.current?.update(engine.objects, deltaMs);

      // Throttled: see `TELEMETRY_SAMPLE_INTERVAL_MS`'s doc for why this isn't every frame.
      const wallClockNow = performance.now();
      if (wallClockNow - telemetrySampleRef.current >= TELEMETRY_SAMPLE_INTERVAL_MS) {
        telemetrySampleRef.current = wallClockNow;
        setTelemetry(buildTelemetry(engine.objects, engineConfig));
      }
    });

    return () => {
      manager.scene.onBeforeRenderObservable.remove(observer);
      simEngineRef.current = null;
      trails.dispose();
      trailLayerRef.current = null;
      layer.dispose();
      objectLayerRef.current = null;
      fps.dispose();
      manager.dispose();
      managerRef.current = null;
    };
    // Mount-once: the canvas lifecycle owns the manager/FPS-widget/object-layer trio; later prop changes flow through the values effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    // Debounce regeneration so slider/form drags do not thrash the mesh builder.
    const handle = setTimeout(() => {
      manager.render(generatePlanet(values));
    }, 150);
    return () => clearTimeout(handle);
  }, [values]);

  useEffect(() => {
    // Debounced like the terrain regen above, but kept in its own effect so adding an object (which
    // only changes `definitions`) rebuilds the sim engine without re-rendering the planet mesh.
    const handle = setTimeout(() => {
      simEngineRef.current = buildSimEngine(values, definitions);
      configRef.current = values;
    }, 150);
    return () => clearTimeout(handle);
  }, [values, definitions]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !gizmosVisible) {
      return;
    }

    // Created/disposed only while the toolbar toggle is on, independent of the mount-once canvas
    // lifecycle above — the render-loop observer reads `gizmoLayerRef.current` fresh each frame.
    const gizmos = new GizmoLayer({ scene: manager.scene });
    gizmoLayerRef.current = gizmos;
    return () => {
      gizmos.dispose();
      gizmoLayerRef.current = null;
    };
  }, [gizmosVisible]);

  const handleChange = useCallback(
    (patch: Partial<Terra.TerraConfig>) => updateConfig((draft) => Object.assign(draft, patch)),
    [updateConfig],
  );

  const handleWaterSheen = useCallback((enabled: boolean) => managerRef.current?.setWaterSheen(enabled), []);

  const handleTogglePlaying = useCallback(() => {
    const clock = clockRef.current;
    const nowMs = performance.now();
    if (clock.pausedAtMs === null) {
      clock.pausedAtMs = nowMs;
    } else {
      clock.pausedTotalMs += nowMs - clock.pausedAtMs;
      clock.pausedAtMs = null;
    }
    setIsPlaying((current) => !current);
  }, []);

  const handleAddRandomObject = useCallback(() => {
    const definition = Terra.makeRandomObject(terra, performance.now());
    Obj.setParent(definition, terra);
    Obj.update(terra, (terra) => {
      terra.objects.push(Ref.make(definition));
    });
  }, [terra]);

  const handleToggleGizmos = useCallback(() => setGizmosVisible((current) => !current), []);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'toggle-playing',
          {
            label: isPlaying ? ['pause.label', { ns: meta.profile.key }] : ['play.label', { ns: meta.profile.key }],
            icon: isPlaying ? 'ph--pause--regular' : 'ph--play--regular',
            disposition: 'toolbar',
            testId: 'terra.toolbar.toggle-playing',
          },
          () => handleTogglePlaying(),
        )
        .action(
          'add-random-object',
          {
            label: ['add-random-object.label', { ns: meta.profile.key }],
            icon: 'ph--dice-five--regular',
            disposition: 'toolbar',
            testId: 'terra.toolbar.add-random-object',
          },
          () => handleAddRandomObject(),
        )
        .separator()
        .action(
          'toggle-gizmos',
          {
            label: gizmosVisible
              ? ['hide-gizmos.label', { ns: meta.profile.key }]
              : ['show-gizmos.label', { ns: meta.profile.key }],
            icon: gizmosVisible ? 'ph--cube--regular' : 'ph--cube-transparent--regular',
            disposition: 'toolbar',
            testId: 'terra.toolbar.toggle-gizmos',
          },
          () => handleToggleGizmos(),
        )
        .build(),
    [isPlaying, handleTogglePlaying, handleAddRandomObject, gizmosVisible, handleToggleGizmos],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild classNames='dx-container'>
          <Menu.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <div className='relative grow'>
            <canvas
              ref={canvasRef}
              className='dx-container absolute inset-0 outline-none'
              style={{ touchAction: 'none' }}
            />
            <div className='absolute top-2 right-2 z-10'>
              <TerraForm config={config} onChange={handleChange} onWaterSheen={handleWaterSheen} />
            </div>
            <div className='absolute bottom-2 right-2 z-10'>
              <TelemetryPanel rows={telemetry} />
            </div>
          </div>
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

TerraArticle.displayName = 'TerraArticle';

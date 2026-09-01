//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Terra, TerraObject } from '#types';

import { seaRadius } from '../../engine/index.ts';
import { SimEngine, type SimObject, buildNavGrid, pickReachableTarget, toGeo } from '../../sim/index.ts';
import { STORY_ATTENDABLE_ID, withAttention } from '../../testing/index.ts';
import { TelemetryPanel, type TelemetryRow } from '../TelemetryPanel/index.ts';
import { TerraMap } from './TerraMap.tsx';

/**
 * The map is an overview of slow-moving objects, not a cockpit view: sampling the sim at ~15Hz
 * keeps the tracks smooth while React re-renders a fifth as often as the render loop would.
 */
const SAMPLE_INTERVAL_MS = 66;

const RAD_TO_DEG = 180 / Math.PI;

/** Kinds whose destination is a routed waypoint, and so can be re-targeted on demand. */
const isRouted = (kind: TerraObject.Kind): boolean => kind === 'boat' || kind === 'tank' || kind === 'plane';

const buildTelemetry = (objects: readonly SimObject[], sea: number): TelemetryRow[] =>
  objects.map(({ definition, state }) => {
    const { lat, lng } = toGeo(state.unit);
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

type StoryArgs = { seed: string; terrain: boolean };

const DefaultStory = ({ seed, terrain }: StoryArgs) => {
  const terra = useMemo(() => Terra.makeDemoWorld({ config: { seed, resolution: 96 } }), [seed]);
  const values = useMemo(() => Terra.toConfigValues(terra), [terra]);
  const grid = useMemo(() => buildNavGrid(values), [values]);
  const definitions = useMemo(
    () => terra.objects.map((ref) => ref.target).filter((definition) => definition != null),
    [terra],
  );

  const engine = useMemo(() => new SimEngine({ config: values, definitions, grid }), [values, definitions, grid]);

  // Mirrors `TerraArticle`: while paused, `pausedAtMs` freezes the clock and the elapsed pause is
  // folded into `pausedTotalMs` on resume, so the engine stays closed-form in absolute time.
  const clockRef = useRef<{ pausedTotalMs: number; pausedAtMs: number | null }>({
    pausedTotalMs: 0,
    pausedAtMs: null,
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [objects, setObjects] = useState<readonly SimObject[]>(() => engine.objects);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const simNow = useCallback(() => {
    const clock = clockRef.current;
    return (clock.pausedAtMs ?? performance.now()) - clock.pausedTotalMs;
  }, []);

  useEffect(() => {
    let frame = 0;
    let sampledAt = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - sampledAt < SAMPLE_INTERVAL_MS) {
        return;
      }
      sampledAt = now;
      engine.evaluateAt(simNow());
      // A new array each sample so React sees the change; the states themselves are fresh objects.
      setObjects([...engine.objects]);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [engine, simNow]);

  const handleTogglePlaying = useCallback(() => {
    const clock = clockRef.current;
    const now = performance.now();
    if (clock.pausedAtMs === null) {
      clock.pausedAtMs = now;
    } else {
      clock.pausedTotalMs += now - clock.pausedAtMs;
      clock.pausedAtMs = null;
    }
    setIsPlaying((playing) => !playing);
  }, []);

  const handleRetarget = useCallback(() => {
    const routed = engine.objects.filter(({ definition }) => isRouted(definition.kind));
    // Falling back to a random routed object keeps the button useful before anything is picked.
    const object =
      routed.find(({ definition }) => definition.id === selectedId) ??
      routed[Math.floor(Math.random() * routed.length)];
    if (!object) {
      return;
    }

    const target = pickReachableTarget({
      grid,
      domain: TerraObject.domainFor(object.definition.kind),
      from: object.state.unit,
      random: Math.random,
    });
    // Re-placed from where it is now, at the current instant, so the engine plans leg 0 of a fresh
    // sequence rather than resuming a leg it is midway through.
    Obj.update(object.definition, (definition) => {
      definition.source = { ...toGeo(object.state.unit), height: 0 };
      definition.target = { ...toGeo(target), height: 0 };
      definition.spawnedAt = simNow();
    });
    // Only this object is re-derived; rebuilding the engine would restart everything else's leg
    // sequence from spawn.
    engine.respawn(object.definition.id);
    setSelectedId(object.definition.id);
  }, [engine, grid, selectedId, simNow]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'toggle-playing',
          {
            label: isPlaying ? 'Pause' : 'Play',
            icon: isPlaying ? 'ph--pause--regular' : 'ph--play--regular',
            disposition: 'toolbar',
            testId: 'terra.map.toggle-playing',
          },
          () => handleTogglePlaying(),
        )
        .action(
          'retarget',
          {
            label: 'New destination',
            icon: 'ph--map-pin--regular',
            disposition: 'toolbar',
            testId: 'terra.map.retarget',
          },
          () => handleRetarget(),
        )
        .build(),
    [isPlaying, handleTogglePlaying, handleRetarget],
  );

  const telemetry = useMemo(() => buildTelemetry(objects, seaRadius(values)), [objects, values]);

  return (
    <Menu.Root {...menuActions} attendableId={STORY_ATTENDABLE_ID}>
      <Panel.Root role='article'>
        <Panel.Toolbar asChild classNames='dx-expand'>
          <Menu.Toolbar>
            <Menu.Items />
          </Menu.Toolbar>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <div className='relative grow overflow-hidden'>
            <TerraMap
              objects={objects}
              config={values}
              terrain={terrain}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <div className='absolute bottom-2 right-2 z-10'>
              <TelemetryPanel rows={telemetry} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

const meta = {
  title: 'plugins/plugin-terra/components/TerraMap',
  component: DefaultStory,
  decorators: [withTheme(), withAttention(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
  args: { seed: 'terra-4', terrain: true },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Test:
 * 1. The demo world's objects appear on the graticule, each with a dashed route from a hollow
 *    origin circle to a cross-marked destination, pointing along its course.
 * 2. Click `Pause`: every object stops. Click `Play`: they resume from where they stopped, not
 *    from where they would have been.
 * 3. Click an object (or a telemetry row): it gains a selection ring and the row highlights.
 * 4. Click `New destination`: the selected object's route is replanned from its current position
 *    to a new destination; boats stay at sea and tanks stay on land.
 * 5. Click empty water to clear the selection; `New destination` then re-targets a random object.
 */
export const Default: Story = {};

/** Without the terrain backdrop — routes and the graticule alone. */
export const GridOnly: Story = {
  args: { terrain: false },
};

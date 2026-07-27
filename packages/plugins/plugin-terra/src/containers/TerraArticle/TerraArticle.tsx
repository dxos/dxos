//
// Copyright 2026 DXOS.org
//

import { type Observer } from '@babylonjs/core/Misc/observable';
import { type Scene } from '@babylonjs/core/scene';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { TerraForm } from '#components';
import { Terra, TerraObject } from '#types';

import { SceneFpsWidget, SceneManager, type TerraConfigValues, generatePlanet } from '../../engine';
import { ObjectLayer } from '../../scene';
import { SimEngine, buildNavGrid } from '../../sim';

export type TerraArticleProps = AppSurface.ObjectArticleProps<Terra.Terra>;

/** Resolves `terra.objects` (an array of refs) to their loaded definitions. */
const resolveDefinitions = (terra: Terra.Terra): TerraObject.TerraObject[] =>
  terra.objects
    .map((ref) => ref.target)
    .filter((definition): definition is TerraObject.TerraObject => definition != null);

/** A `SimEngine` over `definitions`, with a nav grid freshly built for `values` — the grid depends on the seed. */
const buildSimEngine = (values: TerraConfigValues, definitions: readonly TerraObject.TerraObject[]): SimEngine =>
  new SimEngine({ config: values, definitions, grid: buildNavGrid(values) });

export const TerraArticle = ({ subject: terra }: TerraArticleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const objectLayerRef = useRef<ObjectLayer | null>(null);
  const simEngineRef = useRef<SimEngine | null>(null);
  const [config, updateConfig] = useObject(terra, 'config');

  const values = useMemo(() => Terra.toConfigValues(terra), [config, terra]);
  const definitions = useMemo(() => resolveDefinitions(terra), [terra]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const manager = new SceneManager(canvasRef.current);
    managerRef.current = manager;

    const fps = new SceneFpsWidget({ scene: manager.scene, engine: manager.engine });

    const layer = new ObjectLayer({ scene: manager.scene });
    objectLayerRef.current = layer;
    simEngineRef.current = buildSimEngine(Terra.toConfigValues(terra), resolveDefinitions(terra));

    const observer: Observer<Scene> = manager.scene.onBeforeRenderObservable.add(() => {
      const engine = simEngineRef.current;
      if (!engine) {
        return;
      }
      engine.evaluateAt(performance.now());
      layer.update(engine.objects);
    });

    return () => {
      manager.scene.onBeforeRenderObservable.remove(observer);
      simEngineRef.current = null;
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
      simEngineRef.current = buildSimEngine(values, definitions);
    }, 150);
    return () => clearTimeout(handle);
  }, [values, definitions]);

  const handleChange = useCallback(
    (patch: Partial<Terra.TerraConfig>) => updateConfig((draft) => Object.assign(draft, patch)),
    [updateConfig],
  );

  const handleWaterSheen = useCallback((enabled: boolean) => managerRef.current?.setWaterSheen(enabled), []);

  return (
    <Panel.Root>
      <Panel.Toolbar />
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
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

TerraArticle.displayName = 'TerraArticle';

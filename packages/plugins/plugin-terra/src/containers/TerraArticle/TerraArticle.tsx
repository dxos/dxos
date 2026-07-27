//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { TerraForm } from '#components';
import { Terra } from '#types';

import { SceneFpsWidget, SceneManager, generatePlanet } from '../../engine';

export type TerraArticleProps = AppSurface.ObjectArticleProps<Terra.Terra>;

export const TerraArticle = ({ subject: terra }: TerraArticleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [config, updateConfig] = useObject(terra, 'config');

  const values = useMemo(() => Terra.toConfigValues(terra), [config, terra]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const manager = new SceneManager(canvasRef.current);
    managerRef.current = manager;

    const fps = new SceneFpsWidget({ scene: manager.scene, engine: manager.engine });

    return () => {
      fps.dispose();
      manager.dispose();
      managerRef.current = null;
    };
    // Mount-once: the canvas lifecycle owns the manager/FPS-widget pair; later prop changes flow through the values effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    // Debounce regeneration so slider/form drags do not thrash the mesh builder.
    const handle = setTimeout(() => manager.render(generatePlanet(values)), 150);
    return () => clearTimeout(handle);
  }, [values]);

  const handleChange = useCallback(
    (patch: Terra.TerraConfig) => updateConfig((draft) => Object.assign(draft, patch)),
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

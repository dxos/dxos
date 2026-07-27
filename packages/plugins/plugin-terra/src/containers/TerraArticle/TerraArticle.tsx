//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { Terra } from '#types';

import { SceneGui, SceneManager, generatePlanet } from '../../engine';

export type TerraArticleProps = AppSurface.ObjectArticleProps<Terra.Terra>;

export const TerraArticle = ({ subject: terra }: TerraArticleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const guiRef = useRef<SceneGui | null>(null);
  const [config, updateConfig] = useObject(terra, 'config');

  const values = useMemo(() => Terra.toConfigValues(terra), [config, terra]);

  // Kept fresh every render so the mount-once GUI callback always writes through the current updater.
  const updateConfigRef = useRef(updateConfig);
  updateConfigRef.current = updateConfig;

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const manager = new SceneManager(canvasRef.current);
    managerRef.current = manager;

    const gui = new SceneGui({
      scene: manager.scene,
      engine: manager.engine,
      values,
      onChange: (patch) => updateConfigRef.current((draft) => Object.assign(draft, patch)),
      onWaterSheen: (enabled) => manager.setWaterSheen(enabled),
    });
    guiRef.current = gui;

    return () => {
      gui.dispose();
      guiRef.current = null;
      manager.dispose();
      managerRef.current = null;
    };
    // Mount-once: the canvas lifecycle owns the manager/gui pair; later prop changes flow through the values effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    guiRef.current?.setValues(values);

    // Debounce regeneration so slider/form drags do not thrash the mesh builder.
    const handle = setTimeout(() => manager.render(generatePlanet(values)), 150);
    return () => clearTimeout(handle);
  }, [values]);

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
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

TerraArticle.displayName = 'TerraArticle';

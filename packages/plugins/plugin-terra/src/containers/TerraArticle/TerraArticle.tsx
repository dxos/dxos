//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { Terra } from '#types';

import { SceneManager, generatePlanet } from '../../engine';

export type TerraArticleProps = AppSurface.ObjectArticleProps<Terra.Terra>;

export const TerraArticle = ({ subject: terra }: TerraArticleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const [config] = useObject(terra, 'config');

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const manager = new SceneManager(canvasRef.current);
    managerRef.current = manager;
    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, []);

  const values = useMemo(() => Terra.toConfigValues(terra), [config, terra]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }
    // Debounce regeneration so slider/form drags do not thrash the mesh builder.
    const handle = setTimeout(() => manager.render(generatePlanet(values)), 150);
    return () => clearTimeout(handle);
  }, [values]);

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <div className='relative grow'>
          <canvas ref={canvasRef} className='dx-container absolute inset-0' style={{ touchAction: 'none' }} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

TerraArticle.displayName = 'TerraArticle';

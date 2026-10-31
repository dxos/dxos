//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Scene } from '@dxos/scene';

import { type ThemeMode } from '../model/index.ts';
import { type Viewport, project } from './camera.ts';
import { type RenderItem } from './render-list.ts';
import { type Theme3D, isNeuTheme, themeMode3D } from './style.ts';

export type SceneLabelsProps = {
  items: readonly RenderItem[];
  camera: Scene.Camera3D;
  viewport: Viewport;
  theme: Theme3D;
  /** The app's light or dark mode, for a look that follows it; light when unset. */
  mode?: ThemeMode;
};

/** HTML labels over the projected items: a frame's above it, an element's on it. */
export const SceneLabels = ({ items, camera, viewport, theme, mode = 'light' }: SceneLabelsProps) => {
  const dark = theme === 'presentation' || (isNeuTheme(theme) && themeMode3D(theme, mode) === 'dark');
  return (
    <div className='dx-cover pointer-events-none overflow-hidden' data-testid='scene.3d.labels'>
      {items.map((item) => {
        if (!item.label) {
          return null;
        }
        const radius = Math.max(item.scale.x, item.scale.y, item.scale.z) / 2;
        const anchor = project(camera, viewport, item.center, radius);
        if (!anchor) {
          return null;
        }
        return (
          <div
            key={item.key}
            data-testid={`scene.3d.label.${item.key}`}
            className='absolute whitespace-pre rounded-sm px-2 text-sm'
            style={{
              left: anchor.x,
              top: item.frame ? anchor.y - anchor.radius : anchor.y,
              transform: item.frame ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)',
              color: dark ? '#e8ecff' : '#1d2129',
              background: dark ? 'rgba(10, 16, 36, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            }}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
};

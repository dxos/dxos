//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Scene } from '@dxos/scene';

import { type Viewport, project } from './camera.ts';
import { type RenderItem } from './render-list.ts';

export type SceneLabelsProps = {
  items: readonly RenderItem[];
  camera: Scene.Camera3D;
  viewport: Viewport;
  theme: 'cad' | 'presentation';
};

/** HTML labels over the projected items: a frame's above it, an element's on it. */
export const SceneLabels = ({ items, camera, viewport, theme }: SceneLabelsProps) => (
  <div className='dx-cover pointer-events-none overflow-hidden' data-testid='scene.3d.labels'>
    {items.map((item) => {
      if (!item.label) {
        return null;
      }
      const radius = Math.max(item.scale.x, item.scale.y, item.scale.z) / 2;
      const anchor = project(camera, viewport, item.position, radius);
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
            color: theme === 'presentation' ? '#e8ecff' : '#1d2129',
            background: theme === 'presentation' ? 'rgba(10, 16, 36, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          }}
        >
          {item.label}
        </div>
      );
    })}
  </div>
);

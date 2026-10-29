//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject } from '@dxos/echo-react';

import { canvasDimension } from '#model';
import { type Canvas } from '#types';

import { type SceneSurfaceProps, SceneView2D } from './SceneView2D.tsx';
import { SceneView3D } from './SceneView3D.tsx';

export type SceneArticleProps = SceneSurfaceProps & { canvas: Canvas.Canvas };

/**
 * A `Canvas` article for either kind of scene: the same floating chrome (tools, actions, inspectors, display) around a
 * viewport and tools that follow the open scene's dimension, react-ui-canvas over a 2D layout or the 3D editor over a 3D
 * one. A card, section or slide shows either as a picture.
 */
export const SceneArticle = ({ canvas, ...props }: SceneArticleProps) => {
  useObject(canvas);
  return canvasDimension(canvas) === '3d' ? (
    <SceneView3D canvas={canvas} role={props.role} attendableId={props.attendableId} />
  ) : (
    <SceneView2D {...props} canvas={canvas} />
  );
};

SceneArticle.displayName = 'SceneArticle';

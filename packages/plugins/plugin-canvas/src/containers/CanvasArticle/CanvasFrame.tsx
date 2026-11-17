//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Camera } from '@dxos/react-ui-canvas';
import { type EditorDisplay, type EditorShot, SceneEditor, createConfig2D } from '@dxos/react-ui-canvas-editor';
import * as Panel from '@dxos/react-ui/Panel';
import { useThemeContext } from '@dxos/react-ui/Theme';
import { type Scene } from '@dxos/scene';

import { EXTENSION_KINDS } from '../../capabilities/extension-node-types.ts';
import { SceneEditorParts } from './SceneEditorParts.tsx';
import { canvasKinds, canvasNodes } from './use-canvas-scene.ts';
import { AUTHORED_CAMERA, fallbackTheme } from './use-dimension2d.ts';

const SCENE = 'frame';

const DOCUMENT: Scene.SceneDocument = {
  scenes: [{ id: SCENE, dim: '2d', layout: SCENE, camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [{ id: SCENE, dim: '2d', elements: {} }],
  models: [],
};

const config = createConfig2D({ nodes: canvasNodes(EXTENSION_KINDS), kinds: canvasKinds(EXTENSION_KINDS) });

const NO_SHOTS: readonly EditorShot[] = [];

const ignore = () => {};

/**
 * The 2D canvas article as a new drawing opens, over an empty scene, for an app to draw before its plugins start. It
 * needs no plugin context, so it offers the plugin's own node kinds; its controls change nothing.
 */
export const CanvasFrame = () => {
  const { themeMode } = useThemeContext();
  const display: EditorDisplay = {
    theme: fallbackTheme(themeMode),
    grid: false,
    snap: true,
    guides: true,
    axes: false,
  };
  return (
    <Panel.Root role={AppSurface.Article.role}>
      <Panel.Body>
        <SceneEditor.Root<Camera>
          config={config}
          document={DOCUMENT}
          scene={SCENE}
          role={AppSurface.Article.role}
          display={display}
          authoredCamera={AUTHORED_CAMERA}
          onIntent={ignore}
          onReadonlyChange={ignore}
          onDisplayChange={ignore}
          onCameraChange={ignore}
          onDockedChange={ignore}
          shots={NO_SHOTS}
          onShotChange={ignore}
        >
          <SceneEditorParts />
        </SceneEditor.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

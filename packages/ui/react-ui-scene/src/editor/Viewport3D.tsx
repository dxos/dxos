//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ViewportProps } from '@dxos/react-ui-canvas';
import { type Scene } from '@dxos/scene';

import { Scene3DEditor, Scene3DView } from '../components/index.ts';
import { isTheme3D } from '../three/index.ts';
import { toTool3D } from './tools3d.ts';

/**
 * The 3D viewport the shared editor draws: Babylon renders and picks, gizmos move the mesh in memory during a drag and
 * write once on release, and every edit reaches the editor as an intent. As a picture it shows the authored view alone.
 */
export const Viewport3D = ({
  document,
  scene,
  editing,
  selection,
  tool,
  readonly,
  picture,
  grid,
  snap,
  theme,
  face,
  camera,
  onSelect,
  onIntent,
  onEdit,
  onContextMenu,
  onFaceChange,
  onCameraChange,
  onResize,
  children,
}: ViewportProps<Scene.Camera3D>) => {
  const look = isTheme3D(theme) ? theme : 'cad';
  if (picture) {
    return <Scene3DView document={document} scene={scene} theme={look} grid={false} orbit={false} />;
  }
  return (
    <Scene3DEditor
      document={document}
      scene={scene}
      editing={editing}
      selection={selection}
      tool={toTool3D(tool)}
      readonly={readonly}
      theme={look}
      grid={grid}
      snap={snap}
      face={face}
      camera={camera}
      onSelect={onSelect}
      onIntent={onIntent}
      onEdit={(layout) => onEdit(layout)}
      onContextMenu={onContextMenu}
      onFaceChange={onFaceChange}
      onCameraChange={onCameraChange}
      onResize={onResize}
    >
      {children}
    </Scene3DEditor>
  );
};

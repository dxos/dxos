//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type EditorCatalog, SceneEditor } from '@dxos/react-ui-canvas-editor';

/** The editor's floating panels over its viewport, drawn over `children`, and its inspector. */
export const SceneEditorParts = ({
  catalogs,
  children,
}: PropsWithChildren<{ catalogs?: readonly EditorCatalog[] }>) => (
  <>
    <SceneEditor.Viewport>
      {children}
      <SceneEditor.Navigation />
      <SceneEditor.Tools />
      <SceneEditor.Actions />
      <SceneEditor.Camera />
      <SceneEditor.Display />
      <SceneEditor.ContextMenu />
      <SceneEditor.Notice />
      <SceneEditor.Timeline />
    </SceneEditor.Viewport>
    <SceneEditor.Inspector catalogs={catalogs} />
  </>
);

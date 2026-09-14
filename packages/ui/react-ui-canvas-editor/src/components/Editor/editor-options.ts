//
// Copyright 2024 DXOS.org
//

import { type EditorOptions } from '../../hooks/index.ts';

// Kept out of `Editor.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a constant exported beside them forces a full page reload on every edit.

export const defaultEditorOptions: EditorOptions = {
  gridSize: 16,
  gridSnap: 16,
  zoomFactor: 2,
  zoomDuration: 300,
};

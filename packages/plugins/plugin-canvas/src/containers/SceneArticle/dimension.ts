//
// Copyright 2026 DXOS.org
//

import { type DimensionConfig, type EditorCatalog, type EditorDisplay } from '@dxos/react-ui-canvas-editor';

/**
 * What one dimension gives the shared scene article: its editor config, the display and camera this viewer sees, and
 * the style catalogs its Styles section lists. Everything else is the same in both dimensions (`useSceneEditor`).
 */
export type SceneDimension<C> = {
  config: DimensionConfig<C>;
  display: EditorDisplay;
  onDisplayChange: (next: Partial<EditorDisplay>) => void;
  /** This viewer's camera, undefined until they move it. */
  camera: C | undefined;
  authoredCamera: C | undefined;
  onCameraChange: (camera: C) => void;
  catalogs?: readonly EditorCatalog[];
};

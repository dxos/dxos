//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every change is an edit of the draw state, which
// reaches the host as layout intents; the view never writes the document itself (decision 11).
//

import { CanvasRoot } from './CanvasRoot.tsx';
import { CanvasViewport } from './CanvasViewport.tsx';

export const Canvas = {
  Root: CanvasRoot,
  Viewport: CanvasViewport,
};

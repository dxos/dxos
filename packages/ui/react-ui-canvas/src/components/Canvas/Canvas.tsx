//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6-§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import {
  CanvasActions,
  CanvasDebug,
  CanvasNavigation,
  CanvasTheme,
  CanvasTimeline,
  CanvasTools,
} from './CanvasBars.tsx';
import { CanvasLayers, CanvasObjects, CanvasProperties, CanvasViews } from './CanvasInspectors.tsx';
import { CanvasRoot } from './CanvasRoot.tsx';
import { CanvasViewport } from './CanvasViewport.tsx';

export const Canvas = {
  Root: CanvasRoot,
  Viewport: CanvasViewport,
  Navigation: CanvasNavigation,
  Actions: CanvasActions,
  Debug: CanvasDebug,
  Theme: CanvasTheme,
  Tools: CanvasTools,
  Properties: CanvasProperties,
  Views: CanvasViews,
  Layers: CanvasLayers,
  Objects: CanvasObjects,
  Timeline: CanvasTimeline,
};

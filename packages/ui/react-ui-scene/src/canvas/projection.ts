//
// Copyright 2026 DXOS.org
//

import {
  type FreehandProjectionOptions,
  type Projection,
  createFreehandProjection,
  createLatticeProjection,
} from '@dxos/react-ui-canvas';
import { type Scene, findLayout } from '@dxos/scene';

/**
 * The engine projection of each View from its layout's own mode: a layout with a lattice puts shapes on its cells and
 * routes links along its gutters, any other is freehand. `read` gives the document as it is when a View opens.
 */
export const layoutProjection =
  (read: () => Scene.SceneDocument) =>
  (projection: FreehandProjectionOptions): Projection => {
    const layout = findLayout(read(), projection.sceneId);
    return layout?.dim === '2d' && layout.lattice
      ? createLatticeProjection({ ...projection, spec: layout.lattice })
      : createFreehandProjection(projection);
  };

/** A key that changes only when a layout's lattice does, so a projection made from the layouts is made again then. */
export const latticesKey = (document: Scene.SceneDocument): string =>
  JSON.stringify(document.layouts.map((layout) => (layout.dim === '2d' ? layout.lattice : undefined)));

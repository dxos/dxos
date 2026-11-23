//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj, Type } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { canvasDimension, canvasSvg, loadCanvas } from '#model';
import { Canvas } from '#types';

/** Renders a drawing's canvas once all of it has loaded, since a canvas that was never opened has only its refs. */
const drawingSvg = Effect.fnUntraced(function* (drawing: Drawing.Drawing) {
  const canvas = yield* Effect.tryPromise({
    try: () => drawing.canvas.load(),
    catch: AppCapabilities.ExportError.wrap(),
  });
  if (!Canvas.isCanvas(canvas)) {
    return yield* Effect.fail(new AppCapabilities.ExportError({ message: 'Only canvas drawings can be exported.' }));
  }

  yield* loadCanvas(canvas);
  if (canvasDimension(canvas) !== '2d') {
    return yield* Effect.fail(new AppCapabilities.ExportError({ message: 'Only 2D canvases can be exported.' }));
  }

  return canvasSvg(canvas);
});

/** A `Drawing` is one type over every format, and only a 2D canvas has the layout this exporter renders. */
export const exporter: AppCapabilities.Exporter = {
  id: Type.getTypename(Drawing.Drawing),
  available: (drawing: Drawing.Drawing, get) => {
    if (!get(Obj.atom(drawing.canvas))) {
      return false;
    }

    const canvas = drawing.canvas.target;
    if (!Canvas.isCanvas(canvas) || canvas.scenes.length === 0) {
      return false;
    }

    return get(Obj.atom(canvas.scenes[0])) !== undefined && canvasDimension(canvas) === '2d';
  },
  save: (drawing: Drawing.Drawing) =>
    drawingSvg(drawing).pipe(
      Effect.map((content) => ({ extension: 'svg', mimeType: 'image/svg+xml;charset=utf-8', content })),
    ),
  print: drawingSvg,
};

export default Capability.makeModule(() => Effect.succeed(Capability.contribute(AppCapabilities.Exporter, exporter)));

//
// Copyright 2026 DXOS.org
//

//
// Excalidraw implementation of the illustrator `SketchBuilder` contract: maps the scene DSL
// onto the excalidraw element map stored in `Excalidraw.Canvas.content`.
//

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type ApplyResult, type SketchBuilder } from '@dxos/plugin-illustrator/model';

import { Excalidraw } from '../types';
import { applyCommands } from './apply';
import { readScene } from './read';

export const excalidrawBuilder: SketchBuilder = {
  read: (canvas) => {
    invariant(Obj.instanceOf(Excalidraw.Canvas, canvas));
    return readScene(canvas.content);
  },
  apply: (canvas, commands) => {
    invariant(Obj.instanceOf(Excalidraw.Canvas, canvas));
    let result: ApplyResult = { upserted: [], removed: 0 };
    Obj.update(canvas, (canvas) => {
      result = applyCommands(canvas.content as Obj.Mutable<typeof canvas.content>, commands);
    });
    return result;
  },
};

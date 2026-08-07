//
// Copyright 2026 DXOS.org
//

//
// Renderer-neutral builder contract: each variant (tldraw, excalidraw, …) implements
// `DrawingBuilder` to compile the scene DSL onto its canvas records and derive the scene back
// from them. Implementations are contributed via `IllustratorCapabilities.VariantProvider`.
//

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import * as Drawing from '../types/Drawing';
import { type ApplyResult, type ContentHandler, type ContentMap, type ReadResult, applyCommands } from './content';
import type * as Scene from './scene';

/**
 * Maps the scene DSL onto a canvas. Geometry is derived from the live records — not a stored
 * copy — so the model stays coherent after users drag or resize shapes in the renderer's UI.
 */
export type DrawingBuilder = {
  /** Renderer dialect this builder handles; matched against `Canvas.schema`. */
  readonly schema: string;
  /** Derive the neutral scene from the canvas. */
  read: (canvas: Drawing.Canvas) => ReadResult;
  /** Apply a batch of edit commands atomically. */
  apply: (canvas: Drawing.Canvas, commands: readonly Scene.Command[]) => ApplyResult;
};

/**
 * Builds a {@link DrawingBuilder} from the renderer's {@link ContentHandler}, so a variant only
 * supplies its record encoding and inherits the ECHO write semantics and command bookkeeping.
 */
export const makeBuilder = ({ schema, handler }: { schema: string; handler: ContentHandler }): DrawingBuilder => ({
  schema,
  read: (canvas) => {
    invariant(Obj.instanceOf(Drawing.Canvas, canvas));
    return handler.read(canvas.content);
  },
  apply: (canvas, commands) => {
    invariant(Obj.instanceOf(Drawing.Canvas, canvas));
    let result: ApplyResult = { upserted: [], removed: 0 };
    Obj.update(canvas, (canvas) => {
      result = applyCommands(canvas.content as ContentMap, commands, handler);
    });
    return result;
  },
});

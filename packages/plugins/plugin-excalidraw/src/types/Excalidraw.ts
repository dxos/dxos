//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';

/** Schema identifier embedded in the persisted canvas payload. */
export const EXCALIDRAW_SCHEMA = 'excalidraw.com/2';

/**
 * Persisted Excalidraw canvas. `content` is an opaque map of ElementId → ExcalidrawElement
 * managed by the store adapter; we treat it as JSON-compatible data so the ECHO/Automerge
 * layer can CRDT-merge incremental changes without knowing the shape.
 * Referenced by the base `Sketch` (plugin-illustrator) as its renderer-specific canvas.
 */
export class Canvas extends Type.makeObject<Canvas>(DXN.make('org.dxos.type.excalidraw.canvas', '0.1.0'))(
  Schema.Struct({
    /** Versioning tag so the adapter can detect payloads it doesn't understand. */
    schema: Schema.String.pipe(Schema.optional),
    content: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }).pipe(HiddenAnnotation.set(true)),
) {}

export type MakeOptions = Partial<Obj.MakeProps<typeof Canvas>>;

/**
 * Creates an empty {@link Canvas}.
 */
export const makeCanvas = ({ schema = EXCALIDRAW_SCHEMA, content = {} }: MakeOptions = {}): Canvas =>
  Obj.make(Canvas, { schema, content });

/** Type guard for {@link Canvas} objects. */
export const isCanvas = (object: unknown): object is Canvas => Obj.instanceOf(Canvas, object);

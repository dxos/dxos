//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';

export const TLDRAW_SCHEMA = 'tldraw.com/2';

/**
 * Persisted tldraw canvas: an opaque map of RecordId → TLRecord managed by the store adapter.
 * Referenced by the base `Sketch` (plugin-illustrator) as its renderer-specific canvas.
 * Keeps the pre-variant typename (`org.dxos.type.canvas`) so existing stored sketches load
 * without a data migration.
 */
export class Canvas extends Type.makeObject<Canvas>(DXN.make('org.dxos.type.canvas', '0.1.0'))(
  Schema.Struct({
    /** Fully qualified external schema reference. */
    // TODO(wittjosiah): Remove once the schema is fully internalized.
    schema: Schema.String.pipe(Schema.optional),
    content: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }).pipe(HiddenAnnotation.set(true)),
) {}

export type MakeOptions = Partial<Obj.MakeProps<typeof Canvas>>;

/**
 * Creates an empty {@link Canvas}.
 */
export const makeCanvas = ({ schema = TLDRAW_SCHEMA, content = {} }: MakeOptions = {}): Canvas =>
  Obj.make(Canvas, { schema, content });

/** Type guard for {@link Canvas} objects. */
export const isCanvas = (object: unknown): object is Canvas => Obj.instanceOf(Canvas, object);

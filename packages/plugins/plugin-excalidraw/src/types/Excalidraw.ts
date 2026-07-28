//
// Copyright 2026 DXOS.org
//
// Own data schema for the Excalidraw plugin. Sharing the `Sketch` schema from
// `@dxos/plugin-sketch` would transitively pull in the tldraw runtime and produce a
// "multiple tldraw versions installed" warning when a bundle links both plugins.
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, HiddenAnnotation } from '@dxos/echo/Annotation';
import { CollectionItemAnnotation } from '@dxos/schema';

/** Schema identifier embedded in the persisted canvas payload. */
export const EXCALIDRAW_SCHEMA = 'excalidraw.com/2';

/**
 * Persisted Excalidraw canvas. `content` is an opaque map of ElementId → ExcalidrawElement
 * managed by the store adapter; we treat it as JSON-compatible data so the ECHO/Automerge
 * layer can CRDT-merge incremental changes without knowing the shape.
 */
export class Canvas extends Type.makeObject<Canvas>(DXN.make('org.dxos.type.excalidraw.canvas', '0.1.0'))(
  Schema.Struct({
    /** Versioning tag so the adapter can detect payloads it doesn't understand. */
    schema: Schema.String.pipe(Schema.optional),
    content: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }).pipe(HiddenAnnotation.set(true)),
) {}

/** The user-facing Excalidraw object — a named handle around a canvas. */
export class Excalidraw extends Type.makeObject<Excalidraw>(DXN.make('org.dxos.type.excalidraw', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    canvas: Ref.Ref(Canvas).pipe(FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--compass-tool--regular', hue: 'indigo' }),
    // Collection eligibility: `AppNode.isCollectionItem` reads this, and without it new objects are
    // filed under the database section's `types/` subtree instead of the target collection.
    CollectionItemAnnotation.set(true),
  ),
) {}

export type MakeOptions = Omit<Obj.MakeProps<typeof Excalidraw>, 'canvas'> & {
  canvas?: Partial<Obj.MakeProps<typeof Canvas>>;
};

/**
 * Creates an {@link Excalidraw} with an optional inline canvas definition.
 */
export const make = ({ canvas: canvasProps, ...props }: MakeOptions = {}) => {
  const { schema = EXCALIDRAW_SCHEMA, content = {} } = canvasProps ?? {};
  const canvas = Obj.make(Canvas, { schema, content });
  return Obj.make(Excalidraw, { ...props, canvas: Ref.make(canvas) });
};

/**
 * Type guard for {@link Excalidraw} objects. `Obj.instanceOf` is typename-aware so
 * plugin-sketch's `Sketch` — which shares the structural shape (`name` + `canvas` ref) —
 * does not false-positively match here.
 */
export const isExcalidraw = (object: unknown): object is Excalidraw => Obj.instanceOf(Excalidraw, object);

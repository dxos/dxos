//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, HiddenAnnotation } from '@dxos/echo/Annotation';
import { CollectionItemAnnotation } from '@dxos/schema';

export const TLDRAW_SCHEMA = 'tldraw.com/2';

export class Canvas extends Type.makeObject<Canvas>(DXN.make('org.dxos.type.canvas', '0.1.0'))(
  Schema.Struct({
    /** Fully qualified external schema reference. */
    // TODO(wittjosiah): Remove once the schema is fully internalized.
    schema: Schema.String.pipe(Schema.optional),
    content: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }).pipe(HiddenAnnotation.set(true)),
) {}

export class Sketch extends Type.makeObject<Sketch>(DXN.make('org.dxos.type.sketch', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    canvas: Ref.Ref(Canvas).pipe(FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--compass-tool--regular', hue: 'indigo' }),
    AppAnnotation.CardAnnotation.set(true),
    CollectionItemAnnotation.set(true),
  ),
) {}

export type MakeOptions = Omit<Obj.MakeProps<typeof Sketch>, 'canvas'> & {
  canvas?: Partial<Obj.MakeProps<typeof Canvas>>;
};

export const make = ({ canvas: canvasProps, ...props }: MakeOptions = {}) => {
  const { schema = TLDRAW_SCHEMA, content = {} } = canvasProps ?? {};
  const canvas = Obj.make(Canvas, { schema, content });
  return Obj.make(Sketch, { ...props, canvas: Ref.make(canvas) });
};

/**
 * Type guard for {@link Sketch} objects. `Obj.instanceOf` is typename-aware so
 * another plugin can share the structural shape (`name` + `canvas` ref — e.g. the
 * excalidraw plugin's own `Excalidraw` type) without false-positively matching
 * as a Sketch at the surface filter.
 */
export const isSketch = (object: any, _schema?: string): object is Sketch => Obj.instanceOf(Sketch, object);

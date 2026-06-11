//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { BoardLayout, defaultLayout } from '@dxos/react-ui-board';

/**
 * Board and layout.
 */
export const Board = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  items: Ref.Ref(Obj.Unknown).pipe(Schema.Array, FormInputAnnotation.set(false)),
  layout: BoardLayout.pipe(FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--squares-four--regular', hue: 'green' }),
  Type.makeObject(DXN.make('org.dxos.type.board', '0.1.0')),
);

export type Board = Type.InstanceType<typeof Board>;

export const makeBoard = (props: Partial<Obj.MakeProps<typeof Board>> = {}) =>
  Obj.make(Board, {
    items: [],
    layout: defaultLayout,
    ...props,
  });

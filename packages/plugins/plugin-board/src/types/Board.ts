//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { BoardLayout, defaultLayout } from '@dxos/react-ui-board';

/**
 * Board and layout.
 */
export const Board = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  items: Ref.Ref(Obj.Unknown).pipe(Schema.Array, FormInputAnnotation.set(false)),
  layout: BoardLayout.pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.board',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--squares-four--regular',
    hue: 'green',
  }),
);

export interface Board extends Schema.Schema.Type<typeof Board> {}

export const makeBoard = (props: Partial<Obj.MakeProps<typeof Board>> = {}) =>
  Obj.make(Board, {
    items: [],
    layout: defaultLayout,
    ...props,
  });

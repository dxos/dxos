//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation, ViewAnnotation } from '@dxos/echo-schema';
import { SpaceSchema } from '@dxos/react-client/echo';
import { BoardLayout, defaultLayout } from '@dxos/react-ui-board';
import { type CreateViewFromSpaceProps, DataType, TypenameAnnotationId, createViewFromSpace } from '@dxos/schema';

import { meta } from '../meta';

/**
 * Board and layout.
 */
export const Board = Schema.Struct({
  name: Schema.optional(Schema.String),
  items: Schema.mutable(Schema.Array(Type.Ref(Type.Expando))),
  layout: Schema.mutable(BoardLayout),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Board',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);

export interface Board extends Schema.Schema.Type<typeof Board> {}

export const make = (props: Partial<Obj.MakeProps<typeof Board>> = {}) =>
  Obj.make(Board, {
    items: [],
    layout: defaultLayout,
    ...props,
  });

type MakeViewProps = Omit<CreateViewFromSpaceProps, 'presentation'> & {
  presentation?: Omit<Obj.MakeProps<typeof Board>, 'name'>;
};

/**
 * Make a board as a view of a data set.
 */
export const makeView = async ({ presentation, ...props }: MakeViewProps) => {
  const board = make(presentation ?? {});
  return createViewFromSpace({ ...props, presentation: board });
};

export const CreateBoard = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Schema.String.annotations({
    [TypenameAnnotationId]: ['used-static', 'dynamic'],
    title: 'Select board record type (leave empty to start fresh)',
  }),
});

export type CreateBoard = Schema.Schema.Type<typeof CreateBoard>;

/**
 * Create board.
 */
export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
  input: Schema.Struct({
    space: SpaceSchema,
  }).pipe(Schema.extend(CreateBoard)),
  output: Schema.Struct({
    object: DataType.View,
  }),
}) {}

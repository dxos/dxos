//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { View, ViewAnnotation } from '@dxos/schema';

/** Per-column entry (ids order, optional hidden). */
const ArrangementColumnEntry = Schema.Struct({
  ids: Schema.Array(Obj.ID),
  hidden: Schema.optional(Schema.Boolean),
});

/** Keyed by columnValue. */
const ArrangementColumns = Schema.Record({
  key: Schema.String,
  value: ArrangementColumnEntry,
}).pipe(FormInputAnnotation.set(false));

/** Column order and per-column card ids. */
export const Arrangement = Schema.Struct({
  order: Schema.Array(Schema.String).pipe(FormInputAnnotation.set(false)),
  columns: ArrangementColumns,
}).pipe(FormInputAnnotation.set(false));

export type Arrangement = Schema.Schema.Type<typeof Arrangement>;

export const Kanban = Schema.Struct({
  name: Schema.optional(Schema.String),

  view: Type.Ref(View.View).pipe(FormInputAnnotation.set(false)),

  /** Column display order and per-column card ids. */
  arrangement: Arrangement,
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Kanban',
    version: '0.3.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
);

/** Instance type; use Kanban.Kanban in type position so namespace has .Kanban as type and .KanbanSchema as schema. */
export interface Kanban extends Schema.Schema.Type<typeof Kanban> {}

type MakeProps = Omit<Partial<Obj.MakeProps<typeof Kanban>>, 'view'> & {
  view: View.View;
};

/**
 * Make a kanban as a view of a data set.
 */
export const make = (props: MakeProps): Kanban => {
  const { name, view, arrangement } = props;
  const order = arrangement?.order ?? [];
  const columns = arrangement?.columns ?? {};
  return Obj.make(Kanban, {
    name,
    view: Ref.make(view),
    arrangement: { order, columns },
  });
};

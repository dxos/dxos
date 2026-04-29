//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { View } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { ViewAnnotation } from '@dxos/schema';

/** Per-column entry (ids order, optional hidden). */
const ArrangementColumnEntry = Schema.Struct({
  ids: Schema.Array(Obj.ID),
  hidden: Schema.Boolean.pipe(Schema.optional),
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

/**
 * v1: pre-existing Kanban shape. Retained as the source for the v1→v2 migration.
 */
export const KanbanV1 = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  view: Ref.Ref(View.View).pipe(FormInputAnnotation.set(false)),
  arrangement: Arrangement,
}).pipe(
  Type.object({
    typename: 'org.dxos.type.kanban',
    version: '0.1.0',
  }),
);

//
// v2 — `spec` is a discriminated union of how items are sourced.
//
// Mirrors the canonical DXOS pattern (see `Trigger.Spec` in
// `@dxos/functions/src/types/Trigger.ts` and `Sequence.Source` in
// `@dxos/plugin-zen`): the `Type.object` schema is a flat `Schema.Struct`,
// and the discriminated union lives one level down as a single field whose
// variants are tagged with a `kind` literal.
//

/** View-variant: items come from running the View's query (the original behaviour). */
export const KanbanViewSpec = Schema.Struct({
  kind: Schema.Literal('view').pipe(FormInputAnnotation.set(false)),
  view: Ref.Ref(View.View).pipe(FormInputAnnotation.set(false)),
});
export type KanbanViewSpec = Schema.Schema.Type<typeof KanbanViewSpec>;

/** Items-variant: kanban owns its items as an explicit ref array (used by externally-synced kanbans). */
export const KanbanItemsSpec = Schema.Struct({
  kind: Schema.Literal('items').pipe(FormInputAnnotation.set(false)),
  /** Property path on each item that drives column membership (e.g. `'listName'`). */
  pivotField: Schema.String,
  /** Items owned directly by the kanban. */
  items: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(FormInputAnnotation.set(false)),
});
export type KanbanItemsSpec = Schema.Schema.Type<typeof KanbanItemsSpec>;

/** Discriminated union of source specs. Distinguished by `kind`. */
export const KanbanSpec = Schema.Union(KanbanViewSpec, KanbanItemsSpec);
export type KanbanSpec = Schema.Schema.Type<typeof KanbanSpec>;

export const Kanban = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  arrangement: Arrangement,
  /** How this kanban sources its items. Discriminated by `spec.kind`. */
  spec: KanbanSpec,
}).pipe(
  Type.object({
    typename: 'org.dxos.type.kanban',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  ViewAnnotation.set(true),
  Annotation.IconAnnotation.set({
    icon: 'ph--kanban--regular',
    hue: 'green',
  }),
);

/** Instance type; narrow on `kanban.spec.kind` (or use the guards below). */
export interface Kanban extends Schema.Schema.Type<typeof Kanban> {}

/** Narrowed view-variant kanban. */
export type KanbanView = Kanban & { spec: KanbanViewSpec };

/** Narrowed items-variant kanban. */
export type KanbanItems = Kanban & { spec: KanbanItemsSpec };

export const isKanbanView = (kanban: Kanban): kanban is KanbanView => kanban.spec.kind === 'view';
export const isKanbanItems = (kanban: Kanban): kanban is KanbanItems => kanban.spec.kind === 'items';

type MakeViewProps = {
  name?: string;
  view: View.View;
  arrangement?: Arrangement;
};

/**
 * Make a view-variant kanban (items sourced via the View's query).
 */
export const make = (props: MakeViewProps): Kanban => {
  const { name, view, arrangement } = props;
  const order = arrangement?.order ?? [];
  const columns = arrangement?.columns ?? {};
  return Obj.make(Kanban, {
    name,
    arrangement: { order, columns },
    spec: { kind: 'view' as const, view: Ref.make(view) },
  });
};

type MakeItemsProps = {
  name?: string;
  arrangement?: Arrangement;
  pivotField: string;
  items?: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
};

/**
 * Make an items-variant kanban (items list owned by the kanban itself, e.g. populated by a sync integration).
 */
export const makeItems = (props: MakeItemsProps): Kanban => {
  const { name, arrangement, pivotField, items = [] } = props;
  const order = arrangement?.order ?? [];
  const columns = arrangement?.columns ?? {};
  return Obj.make(Kanban, {
    name,
    arrangement: { order, columns },
    spec: { kind: 'items' as const, pivotField, items },
  });
};

//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

// TODO(wittjosiah): Reconcile w/ GridItem.
const _KanbanItemSchema = S.struct({
  object: E.ref(E.AnyEchoObject),
  title: S.string,
  index: S.string,
}).pipe(E.echoObject('braneframe.Kanban.Item', '0.1.0'));
export interface KanbanItemType extends E.ObjectType<typeof _KanbanItemSchema> {}
export const KanbanItemSchema: S.Schema<KanbanItemType> = _KanbanItemSchema;

const _KanbanColumnSchema = S.struct({
  title: S.string,
  index: S.string,
  items: S.array(E.ref(KanbanItemSchema)),
}).pipe(E.echoObject('braneframe.Kanban.Column', '0.1.0'));
export interface KanbanColumnType extends E.ObjectType<typeof _KanbanColumnSchema> {}
export const KanbanColumnSchema: S.Schema<KanbanColumnType> = _KanbanColumnSchema;

const _KanbanSchema = S.struct({
  title: S.string,
  columns: S.array(E.ref(KanbanColumnSchema)),
}).pipe(E.echoObject('braneframe.Kanban', '0.1.0'));
export interface KanbanType extends E.ObjectType<typeof _KanbanSchema> {}
export const KanbanSchema: S.Schema<KanbanType> = _KanbanSchema;

export const isKanban = (data: unknown): data is KanbanType => !!data && E.getSchema(data) === KanbanSchema;

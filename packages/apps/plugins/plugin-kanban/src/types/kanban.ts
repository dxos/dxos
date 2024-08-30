//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

export class KanbanItemType extends TypedObject({ typename: 'dxos.org/type/KanbanItem', version: '0.1.0' })({
  object: S.optional(ref(Expando)),
  name: S.optional(S.String),
  index: S.optional(S.String),
}) {}

export class KanbanColumnType extends TypedObject({ typename: 'dxos.org/type/KanbanColumn', version: '0.1.0' })({
  name: S.optional(S.String),
  index: S.optional(S.String),
  items: S.mutable(S.Array(ref(KanbanItemType))),
}) {}

export class KanbanType extends TypedObject({ typename: 'dxos.org/type/Kanban', version: '0.1.0' })({
  name: S.optional(S.String),
  columns: S.mutable(S.Array(ref(KanbanColumnType))),
}) {}

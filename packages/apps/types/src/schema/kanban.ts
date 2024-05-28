//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

import { TextV0Type } from './document';

export class KanbanItemType extends TypedObject({ typename: 'dxos.org/type/KanbanItem', version: '0.1.0' })({
  object: S.optional(ref(Expando)),
  title: ref(TextV0Type),
  index: S.optional(S.string),
}) {}

export class KanbanColumnType extends TypedObject({ typename: 'dxos.org/type/KanbanColumn', version: '0.1.0' })({
  title: S.optional(S.string),
  index: S.optional(S.string),
  items: S.mutable(S.array(ref(KanbanItemType))),
}) {}

export class KanbanType extends TypedObject({ typename: 'dxos.org/type/Kanban', version: '0.1.0' })({
  title: S.optional(S.string),
  columns: S.mutable(S.array(ref(KanbanColumnType))),
}) {}

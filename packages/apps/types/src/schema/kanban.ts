//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

import { TextV0Type } from './document';

export class KanbanItemType extends EchoObjectSchema({ typename: 'braneframe.Kanban.Item', version: '0.1.0' })({
  object: S.optional(E.ref(E.AnyEchoObject)),
  title: E.ref(TextV0Type),
  index: S.optional(S.string),
}) {}

export class KanbanColumnType extends EchoObjectSchema({ typename: 'braneframe.Kanban.Column', version: '0.1.0' })({
  title: S.optional(S.string),
  index: S.optional(S.string),
  items: S.mutable(S.array(E.ref(KanbanItemType))),
}) {}

export class KanbanType extends EchoObjectSchema({ typename: 'braneframe.Kanban', version: '0.1.0' })({
  title: S.optional(S.string),
  columns: S.mutable(S.array(E.ref(KanbanColumnType))),
}) {}

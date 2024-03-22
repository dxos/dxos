//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

export class KanbanItemType extends EchoObjectSchema({ typename: 'braneframe.Kanban.Item', version: '0.1.0' })({
  object: E.ref(E.AnyEchoObject),
  title: S.string,
  index: S.string,
}) {}

export class KanbanColumnType extends EchoObjectSchema({ typename: 'braneframe.Kanban.Column', version: '0.1.0' })({
  title: S.string,
  index: S.string,
  items: S.array(E.ref(KanbanItemType)),
}) {}

export class KanbanType extends EchoObjectSchema({ typename: 'braneframe.Kanban', version: '0.1.0' })({
  title: S.string,
  columns: S.array(E.ref(KanbanColumnType)),
}) {}

export const isKanban = (data: unknown): data is KanbanType => !!data && data instanceof KanbanType;

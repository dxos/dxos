//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

export class FolderType extends EchoObjectSchema({ typename: 'braneframe.Folder', version: '0.1.0' })({
  name: S.optional(S.string),
  objects: S.mutable(S.array(E.ref(E.AnyEchoObject))),
}) {}

export const isFolder = (data: unknown): data is FolderType => !!data && data instanceof FolderType;

export class ViewType extends EchoObjectSchema({ typename: 'braneframe.View', version: '0.1.0' })({
  title: S.string,
  type: S.string,
}) {}

export const isView = (data: unknown): data is ViewType => !!data && data instanceof ViewType;

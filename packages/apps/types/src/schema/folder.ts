//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { TypedObject } from '@dxos/echo-schema';

export class FolderType extends TypedObject({ typename: 'braneframe.Folder', version: '0.1.0' })({
  name: S.optional(S.string),
  objects: S.mutable(S.array(E.ref(E.Expando))),
}) {}

// TODO(burdon): Standardize views?
export class ViewType extends TypedObject({ typename: 'braneframe.View', version: '0.1.0' })({
  title: S.string,
  type: S.string,
}) {}

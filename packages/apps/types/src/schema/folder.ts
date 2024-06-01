//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

export class FolderType extends TypedObject({ typename: 'braneframe.Folder', version: '0.1.0' })({
  name: S.optional(S.String),
  objects: S.mutable(S.Array(ref(Expando))),
}) {}

// TODO(burdon): Standardize views?
export class ViewType extends TypedObject({ typename: 'braneframe.View', version: '0.1.0' })({
  title: S.String,
  type: S.String,
}) {}

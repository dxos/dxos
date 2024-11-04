//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space';
import { ViewType } from '@dxos/schema';

export class TableType extends TypedObject({ typename: 'dxos.org/type/Table', version: '0.1.0' })({
  name: S.optional(S.String),
  // TODO(burdon): Ref.
  view: S.optional(ViewType),
  threads: S.optional(S.mutable(S.Array(ref(ThreadType)))),
}) {}

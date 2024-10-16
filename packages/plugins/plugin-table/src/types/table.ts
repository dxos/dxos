//
// Copyright 2024 DXOS.org
//

import { DynamicSchema, ref, S, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space';
import { ViewSchema } from '@dxos/schema';

// TODO(burdon): Reconcile with react-ui-date/View.

export class TableType extends TypedObject({ typename: 'dxos.org/type/Table', version: '0.1.0' })({
  name: S.optional(S.String),
  schema: S.optional(ref(DynamicSchema)),
  view: S.optional(ViewSchema),
  threads: S.optional(S.mutable(S.Array(ref(ThreadType)))),
}) {}

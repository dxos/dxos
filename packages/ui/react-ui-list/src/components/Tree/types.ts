//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

export const ItemSchema = S.Struct({
  id: S.String,
  name: S.String,
  icon: S.optional(S.String),
  disabled: S.optional(S.Boolean),
  className: S.optional(S.String),
  testId: S.optional(S.String),
  path: S.Array(S.String),
  parentOf: S.optional(S.Array(S.String)),
});

export type ItemType = S.Schema.Type<typeof ItemSchema>;

export const isItem: (item: unknown) => boolean = S.is(ItemSchema);

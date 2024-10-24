//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

const LabelSchema = S.Union(
  S.String,
  S.Tuple(
    S.String,
    S.Struct({
      ns: S.String,
      count: S.optional(S.Number),
    }),
  ),
);

export const ItemSchema = S.mutable(
  S.Struct({
    id: S.String,
    label: S.mutable(LabelSchema),
    icon: S.optional(S.String),
    disabled: S.optional(S.Boolean),
    className: S.optional(S.String),
    testId: S.optional(S.String),
    path: S.Array(S.String),
    parentOf: S.optional(S.Array(S.String)),
  }),
);

export type ItemType = S.Schema.Type<typeof ItemSchema>;

export const isItem: (item: unknown) => boolean = S.is(ItemSchema);

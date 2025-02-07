//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

export const SelectOptionsAnnotationId = Symbol.for('@dxos/schema/annotation/SelectOptions');

export const SelectOptionSchema = S.Struct({
  id: S.String,
  label: S.String,
  deleted: S.optional(S.Boolean), // TODO(ZaymonFC): Not sure if this is necessary.
}).pipe(S.mutable);

export type SelectOption = S.Schema.Type<typeof SelectOptionSchema>;

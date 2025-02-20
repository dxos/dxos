//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/effect';

/** Schema for a single select option. Used to define choices in a {single|multi}-select field. */
export const SelectOptionSchema = S.Struct({
  /** Stable identifier for the option. */
  id: S.NonEmptyString,
  title: S.String,
  /** Color palette used for visual styling. */
  color: S.String,
}).pipe(S.mutable);

export type SelectOption = S.Schema.Type<typeof SelectOptionSchema>;

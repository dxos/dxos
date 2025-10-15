//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Schema for a single select option. Used to define choices in a {single|multi}-select field. */
export const SelectOptionSchema = Schema.Struct({
  /** Stable identifier for the option. */
  id: Schema.NonEmptyString,
  title: Schema.String,
  /** Color palette used for visual styling. */
  color: Schema.String,
}).pipe(Schema.mutable);

export type SelectOption = Schema.Schema.Type<typeof SelectOptionSchema>;

//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

/**
 * Schema for a single select option.
 * Used to define choices in a {single|multi}-select field.
 *
 * @property {string} id - Stable identifier for the option. Must be non-empty.
 * @property {string} title - Display text shown to users in the UI.
 * @property {string} color - Color code (e.g., hex) used for visual styling.
 */
export const SelectOptionSchema = S.Struct({
  id: S.NonEmptyString,
  title: S.String,
  color: S.String,
}).pipe(S.mutable);

export type SelectOption = S.Schema.Type<typeof SelectOptionSchema>;

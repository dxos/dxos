//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Appearance = Schema.Union([
  Schema.Literal('light').annotate({ title: 'Light' }),
  Schema.Literal('dark').annotate({ title: 'Dark' }),
  Schema.Literal('system').annotate({ title: 'System' }),
]);
export type Appearance = Schema.Schema.Type<typeof Appearance>;

/**
 * Theme plugin settings.
 */
export const Settings = Schema.Struct({
  appearance: Schema.optional(
    Appearance.annotate({
      title: 'Appearance',
      description: 'Force light or dark mode, or follow the system setting.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));
export interface Settings extends Schema.Schema.Type<typeof Settings> {}

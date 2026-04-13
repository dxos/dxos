//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.Struct({
  showHints: Schema.optional(Schema.Boolean),
  enableDeck: Schema.optional(Schema.Boolean),
  enableStatusbar: Schema.optional(Schema.Boolean),
  enableNativeRedirect: Schema.optional(Schema.Boolean),
  // TODO(burdon): Rename layoutMode? (e.g., bento | encapsulated?)
  encapsulatedPlanks: Schema.optional(Schema.Boolean),
}).pipe(Schema.mutable);
export type Settings = Schema.Schema.Type<typeof Settings>;

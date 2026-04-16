//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.Struct({
  /** Group messages by thread and display only the most recent message per thread. */
  threads: Schema.optional(Schema.Boolean),
}).pipe(Schema.mutable);
export type Settings = Schema.Schema.Type<typeof Settings>;

//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.Struct({
  /** Group messages into conversations and display only the most recent message per conversation. */
  conversations: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Group by conversation',
      description: 'Group messages and responses that belong to the same conversation.',
    }),
  ),
  /**
   * Whether to render remote (http/https) images inline in messages.
   * Off by default to avoid tracking pixels and to keep network requests off when reading mail.
   */
  loadRemoteImages: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Load remote images',
      description: 'Render remote images inline. When off, image links are shown as plain links.',
    }),
  ),
}).pipe(Schema.mutable);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}

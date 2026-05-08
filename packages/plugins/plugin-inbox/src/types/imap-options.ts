//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Per-target options for an IMAP `Integration`. Stored on
 * `Integration.targets[i].options`. The password lives on
 * `AccessToken.token`, never here.
 */
export const ImapAccountOptions = Schema.Struct({
  host: Schema.String.annotations({
    title: 'Host',
    description: 'IMAP server hostname (e.g. imap.fastmail.com).',
    examples: ['imap.fastmail.com', 'imap.mail.me.com'],
  }),
  port: Schema.optional(
    Schema.Number.annotations({
      title: 'Port',
      description: 'TCP port. Defaults to 993 for implicit TLS, 143 for STARTTLS.',
    }),
  ),
  secure: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Implicit TLS',
      description: 'True for implicit TLS (port 993); false for STARTTLS upgrade on 143.',
    }),
  ),
  folder: Schema.optional(
    Schema.String.annotations({
      title: 'Folder',
      description: 'IMAP folder to sync. Defaults to INBOX.',
      examples: ['INBOX', 'Archive'],
    }),
  ),
  syncBackDays: Schema.optional(
    Schema.Number.annotations({
      title: 'Sync back days',
      description: 'Number of days back to sync on first run.',
    }),
  ),
  filter: Schema.optional(
    Schema.String.annotations({
      title: 'Filter',
      description: 'Optional free-text filter applied during search.',
    }),
  ),
});

export interface ImapAccountOptions extends Schema.Schema.Type<typeof ImapAccountOptions> {}

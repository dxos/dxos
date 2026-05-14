//
// Copyright 2026 DXOS.org
//

// The IMAP service Tag + transport types live in @dxos/functions so both ends of the
// operation runtime (composer-side managed runtime and Workers-side function bundles)
// can reach them without a dependency cycle through plugin-inbox.
export { Imap, ImapAuth, ImapError, ImapUnavailable, readImapPassword as readPassword } from '@dxos/functions';
export type {
  ImapAddress,
  ImapAuthValues,
  ImapBody,
  ImapConnection,
  ImapEnvelope,
  ImapMailbox,
  ImapServiceShape,
} from '@dxos/functions';

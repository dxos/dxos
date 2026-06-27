//
// Copyright 2026 DXOS.org
//

// Jmap: shared JMAP core — session, transport, Filter/Session/Response types.
export * as Jmap from './Jmap';
// JmapMail: mail-specific helpers and types (mailboxGet, emailQuery, Email, Mailbox, …).
export * as JmapMail from './JmapMail';
// Flat re-exports so callers can also import Jmap, JmapMail, getSession, Filter, etc. directly.
export * from './api';

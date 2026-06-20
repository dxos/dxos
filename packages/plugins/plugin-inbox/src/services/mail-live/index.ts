//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Imap, Smtp } from '@dxos/functions';

import { ImapLive } from './imap-live';
import { SmtpLive } from './smtp-live';

export { ImapLive } from './imap-live';
export { SmtpLive } from './smtp-live';

// Raw transport clients. Exposed so thin edge services (e.g. mail-service) can use them
// as stateless RPC backends without going through the Effect Layer plumbing.
export { ImapClient } from './internal/imap-client';
export type { ImapClientAuth, ImapClientOptions, MailboxState, RawEnvelope } from './internal/imap-client';
export { SmtpClient } from './internal/smtp-client';
export type { SmtpClientAuth, SmtpClientOptions, SmtpSendOptions } from './internal/smtp-client';
export { composeMessage } from './internal/mime';
export type { ComposeInput } from './internal/mime';

/**
 * Convenience layer that bundles {@link ImapLive} and {@link SmtpLive}.
 * Function-bundle entry points wire this into the per-bundle managed runtime so
 * operations declaring `services: [Imap, Smtp]` get the live transport on Workers.
 *
 * NOTE: this module imports `cloudflare:sockets` transitively (via the IMAP and SMTP
 * raw clients). Only consume it from a Cloudflare Workers entry point.
 */
export const MailServicesLive: Layer.Layer<Imap | Smtp> = Layer.mergeAll(ImapLive, SmtpLive);

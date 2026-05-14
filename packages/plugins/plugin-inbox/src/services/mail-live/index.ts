//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Imap } from '../imap';
import { ImapCredentials } from '../imap-credentials';
import { Smtp } from '../smtp';
import { SmtpCredentials } from '../smtp-credentials';

import { ImapLive } from './imap-live';
import { SmtpLive } from './smtp-live';

export { ImapLive } from './imap-live';
export { SmtpLive } from './smtp-live';

/**
 * Convenience layer that bundles {@link ImapLive} and {@link SmtpLive}.
 * Consumers in the edge compute-intrinsics worker provide this alongside the
 * existing service container so IMAP/SMTP operations have transport access.
 *
 * NOTE: this module imports `cloudflare:sockets` transitively (via the IMAP
 * and SMTP raw clients). Only consume it from a Cloudflare Workers entry
 * point (e.g. `compute-intrinsics`); browser builds must not import this
 * subpath. The package.json export `./mail-live` exposes it for that use.
 */
import type { ImapError } from '../imap';

export const MailServicesLive: Layer.Layer<Imap | Smtp, ImapError, ImapCredentials | SmtpCredentials> = Layer.mergeAll(
  ImapLive,
  SmtpLive,
);

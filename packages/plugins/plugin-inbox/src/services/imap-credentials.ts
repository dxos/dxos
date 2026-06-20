//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';

import { Database, type Ref } from '@dxos/echo';
import { ImapAuth, ImapError, type ImapAuthValues } from '@dxos/functions';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration';

const DEFAULT_PORT_TLS = 993;
const DEFAULT_PORT_STARTTLS = 143;

const numberOrUndefined = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const booleanOrUndefined = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const stringOrUndefined = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/**
 * Builds an `ImapAuth` from credentials and per-target options. The only required
 * credential field is the password (`token`). Hostname comes from either the `host`
 * target option or the `AccessToken.source` prefix (formatted as `'imap:<host>'`).
 */
const buildAuth = (input: {
  token: string;
  account?: string;
  source: string;
  options: Record<string, unknown>;
}): ImapAuthValues => {
  const optionHost = stringOrUndefined(input.options.host);
  const sourceHost = input.source.startsWith('imap:') ? input.source.slice('imap:'.length) : input.source;
  const host = optionHost ?? sourceHost;
  const secure = booleanOrUndefined(input.options.secure) ?? true;
  const port = numberOrUndefined(input.options.port) ?? (secure ? DEFAULT_PORT_TLS : DEFAULT_PORT_STARTTLS);
  return new ImapAuth({
    host,
    port,
    secure,
    username: input.account ?? '',
    password: Redacted.make(input.token),
  });
};

/**
 * Resolve IMAP auth from an Integration ref. Picks the AccessToken whose `source`
 * starts with `'imap:'` (falls back to the primary token), then merges per-target
 * transport options from `targets[0].options`.
 *
 * The Workers-side `Imap` service takes auth as input, so handlers call this once
 * per invocation and pass the result to `Imap.connect(auth)`.
 */
const toImapError = (error: unknown): ImapError =>
  error instanceof ImapError
    ? error
    : new ImapError({ reason: 'auth', message: error instanceof Error ? error.message : String(error) });

export const resolveImapAuth = (
  integrationRef: Ref.Ref<Integration.Integration>,
): Effect.Effect<ImapAuthValues, ImapError, Database.Service> =>
  Effect.gen(function* () {
    const integration = yield* Database.load(integrationRef);
    if (integration.accessTokens.length === 0) {
      return yield* Effect.fail(new ImapError({ reason: 'auth', message: 'integration has no access tokens' }));
    }
    let token = undefined;
    for (const ref of integration.accessTokens) {
      const loaded = yield* Database.load(ref);
      if (loaded.source.startsWith('imap:')) {
        token = loaded;
        break;
      }
    }
    if (!token) {
      token = yield* Database.load(integration.accessTokens[0]);
    }

    const options = (integration.targets[0]?.options ?? {}) as Record<string, unknown>;
    log('resolved imap auth from integration', {
      source: token.source,
      account: token.account,
    });
    return buildAuth({
      token: token.token ?? '',
      account: token.account,
      source: token.source ?? 'imap',
      options,
    });
  }).pipe(Effect.mapError(toImapError));

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';

import { Database, type Ref } from '@dxos/echo';
import { SmtpAuth, SmtpError, type SmtpAuthValues } from '@dxos/functions';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration';

const DEFAULT_PORT_TLS = 465;
const DEFAULT_PORT_STARTTLS = 587;

const numberOrUndefined = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const booleanOrUndefined = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const stringOrUndefined = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const buildSmtpAuth = (input: {
  token: string;
  account?: string;
  source: string;
  smtpOptions: Record<string, unknown>;
}): SmtpAuthValues => {
  const optionHost = stringOrUndefined(input.smtpOptions.host);
  const sourceHost = input.source.startsWith('smtp:') ? input.source.slice('smtp:'.length) : input.source;
  const host = optionHost ?? sourceHost;
  const secure = booleanOrUndefined(input.smtpOptions.secure) ?? true;
  const rawPort = numberOrUndefined(input.smtpOptions.port) ?? (secure ? DEFAULT_PORT_TLS : DEFAULT_PORT_STARTTLS);
  const port = rawPort === 465 || rawPort === 587 ? rawPort : DEFAULT_PORT_TLS;
  return new SmtpAuth({
    host,
    port,
    username: input.account ?? '',
    password: Redacted.make(input.token),
  });
};

/** Back-compat: pre-nested options stored at top level as `smtpHost`/`smtpPort`/`smtpSecure`. */
const extractFlatSmtpOptions = (options: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if ('smtpHost' in options) {
    out.host = options.smtpHost;
  }
  if ('smtpPort' in options) {
    out.port = options.smtpPort;
  }
  if ('smtpSecure' in options) {
    out.secure = options.smtpSecure;
  }
  return out;
};

/**
 * Resolve SMTP auth from an Integration ref. Walks `integration.accessTokens` for
 * a `'smtp:'`-prefixed source (falls back to the primary token when not found —
 * the common case where IMAP and SMTP share one password). Reads transport config
 * from `targets[0].options.smtp` or flat `smtpHost`/`smtpPort`/`smtpSecure` keys.
 *
 * The Workers-side `Smtp` service takes auth as input, so handlers call this once
 * per invocation and pass the result to `Smtp.send(auth, ...)`.
 */
const toSmtpError = (error: unknown): SmtpError =>
  error instanceof SmtpError
    ? error
    : new SmtpError({ reason: 'auth', message: error instanceof Error ? error.message : String(error) });

export const resolveSmtpAuth = (
  integrationRef: Ref.Ref<Integration.Integration>,
): Effect.Effect<SmtpAuthValues, SmtpError, Database.Service> =>
  Effect.gen(function* () {
    const integration = yield* Database.load(integrationRef);
    if (integration.accessTokens.length === 0) {
      return yield* Effect.fail(new SmtpError({ reason: 'auth', message: 'integration has no access tokens' }));
    }
    let token = undefined;
    for (const ref of integration.accessTokens) {
      const loaded = yield* Database.load(ref);
      if (loaded.source.startsWith('smtp:')) {
        token = loaded;
        break;
      }
    }
    if (!token) {
      token = yield* Database.load(integration.accessTokens[0]);
    }

    const targetOptions = (integration.targets[0]?.options ?? {}) as Record<string, unknown>;
    const smtpOptions =
      (targetOptions.smtp as Record<string, unknown> | undefined) ?? extractFlatSmtpOptions(targetOptions);

    log('resolved smtp auth from integration', {
      source: token.source,
      account: token.account,
    });
    return buildSmtpAuth({
      token: token.token ?? '',
      account: token.account,
      source: token.source ?? 'smtp',
      smtpOptions,
    });
  }).pipe(Effect.mapError(toSmtpError));

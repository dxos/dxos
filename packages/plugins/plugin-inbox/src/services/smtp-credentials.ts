//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { Database, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration/types';

import { SmtpAuth, SmtpError, type SmtpAuthValues } from './smtp';

const DEFAULT_PORT_TLS = 465;
const DEFAULT_PORT_STARTTLS = 587;

const numberOrUndefined = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const booleanOrUndefined = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const stringOrUndefined = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/**
 * Builds an `SmtpAuth` from credentials and per-target options. Required:
 * the password (`token`) and a username. Host is preferred from the SMTP
 * sub-options block; falls back to the AccessToken `source` prefix
 * (`smtp:<host>`).
 */
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

/**
 * Service for accessing SMTP credentials. Mirrors `ImapCredentials`. For
 * mail integrations the same Integration row holds both IMAP and SMTP
 * AccessTokens disambiguated by `source` prefix (`imap:<host>` vs `smtp:<host>`).
 */
export class SmtpCredentials extends Context.Tag('@dxos/plugin-inbox/SmtpCredentials')<
  SmtpCredentials,
  {
    /** Returns the full SMTP auth bundle. */
    readonly get: () => Effect.Effect<SmtpAuthValues, SmtpError>;
  }
>() {
  /**
   * Layer derived from an Integration ref. Walks `integration.accessTokens`,
   * picking the first AccessToken whose `source` starts with `'smtp:'`. Falls
   * back to the primary AccessToken when no SMTP-specific entry exists (which
   * is the common case where IMAP and SMTP share a single password).
   *
   * Reads transport config from `integration.targets[0].options.smtp` and
   * `…options.smtpHost / smtpPort / smtpSecure` for back-compat.
   */
  static fromIntegration = (integrationRef: Ref.Ref<Integration.Integration>) =>
    Layer.effect(
      SmtpCredentials,
      Effect.gen(function* () {
        const integration = yield* Database.load(integrationRef);
        if (integration.accessTokens.length === 0) {
          return yield* Effect.fail(new SmtpError({ reason: 'auth', message: 'integration has no access tokens' }));
        }
        // Try to find a SMTP-specific token; fall back to the primary.
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

        log('using integration smtp credentials', {
          source: token.source,
          account: token.account,
        });
        const auth = buildSmtpAuth({
          token: token.token ?? '',
          account: token.account,
          source: token.source ?? 'smtp',
          smtpOptions,
        });
        return { get: () => Effect.succeed(auth) };
      }),
    );

  /** Convenience accessor — yields the auth bundle. */
  static get = () => Effect.flatMap(SmtpCredentials, (service) => service.get());
}

/** Back-compat: pre-nested `smtp` options stored at the top level as `smtpHost`/`smtpPort`/`smtpSecure`. */
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

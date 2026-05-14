//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { Credential } from '@dxos/compute';
import { Database, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration/types';

import { ImapAuth, ImapError, type ImapAuthValues } from './imap';

const DEFAULT_PORT_TLS = 993;
const DEFAULT_PORT_STARTTLS = 143;

const numberOrUndefined = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const booleanOrUndefined = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const stringOrUndefined = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/**
 * Builds an `ImapAuth` from credentials and per-target options. The only
 * required credential field is the password (`token`). Hostname can come
 * either from the `host` target option or from `accessToken.source`
 * (formatted as `'imap:<host>'`).
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
 * Service for accessing IMAP credentials.
 *
 * Mirrors `GoogleCredentials`: the wrapping `Integration` owns the
 * `AccessToken`, and sync ops compose `fromIntegration(ref)` once at the
 * operation boundary. Falls back to the database `Credential` service when
 * no Integration is in scope (legacy / agent paths).
 */
export class ImapCredentials extends Context.Tag('@dxos/plugin-inbox/ImapCredentials')<
  ImapCredentials,
  {
    /** Returns the full IMAP auth bundle. */
    readonly get: () => Effect.Effect<ImapAuthValues, ImapError>;
  }
>() {
  /**
   * Layer derived from an Integration ref. Loads `accessToken` (password in
   * `.token`, username in `.account`, host in `.source`) and merges
   * per-target options (host, port, secure) from `Integration.targets[0].options`.
   */
  static fromIntegration = (integrationRef: Ref.Ref<Integration.Integration>) =>
    Layer.effect(
      ImapCredentials,
      Effect.gen(function* () {
        const integration = yield* Database.load(integrationRef);
        const primaryRef = integration.accessTokens[0];
        if (!primaryRef) {
          return yield* Effect.fail(new ImapError({ reason: 'auth', message: 'integration has no access tokens' }));
        }
        const accessToken = yield* Database.load(primaryRef);
        const options = (integration.targets[0]?.options ?? {}) as Record<string, unknown>;
        log('using integration imap credentials', {
          source: accessToken.source,
          account: accessToken.account,
        });
        const auth = buildAuth({
          token: accessToken.token ?? '',
          account: accessToken.account,
          source: accessToken.source ?? 'imap',
          options,
        });
        return { get: () => Effect.succeed(auth) };
      }),
    );

  /**
   * Default layer that pulls credentials from the database `Credential`
   * service (used by agents / legacy paths). Multi-account / per-host
   * configuration is not expressible here; prefer `fromIntegration`.
   */
  static default = Layer.effect(
    ImapCredentials,
    Effect.gen(function* () {
      const credentialsService = yield* Credential.CredentialsService;
      return {
        get: () =>
          Effect.gen(function* () {
            const credential = yield* Effect.tryPromise({
              try: () => credentialsService.getCredential({ service: 'imap' }),
              catch: (error) =>
                new ImapError({
                  reason: 'auth',
                  message: error instanceof Error ? error.message : String(error),
                }),
            });
            if (!credential.apiKey) {
              return yield* Effect.fail(
                new ImapError({ reason: 'auth', message: 'IMAP credential is missing the password (apiKey).' }),
              );
            }
            return buildAuth({ token: credential.apiKey, source: 'imap', options: {} });
          }),
      };
    }),
  );

  /** Convenience accessor — yields the auth bundle. */
  static get = () => Effect.flatMap(ImapCredentials, (service) => service.get());
}

//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, type Ref } from '@dxos/echo';
import { type AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
import { Connection } from '@dxos/plugin-connector';

/**
 * Credentials needed to talk to a JMAP server: the server `host` (used to discover the session at
 * `https://${host}/.well-known/jmap`), the optional `account` (email/username for display and
 * identity matching), and the Bearer `token`.
 */
export type Credentials = {
  readonly host: string;
  readonly account: string | undefined;
  readonly token: string;
};

/**
 * Service for accessing JMAP credentials.
 *
 * Mirrors `GoogleCredentials`: an operation invoked with a `Connection` composes
 * `fromConnection(ref)`; one invoked with an external-sync cursor composes
 * `fromAccessToken(cursor.spec.source)` directly (the cursor no longer relates to `Connection`).
 * Unlike Google, there is no database-credential fallback — a JMAP connection always carries host +
 * token in its token record.
 */
export class JmapCredentials extends Context.Tag('JmapCredentials')<JmapCredentials, Credentials>() {
  /** Creates a credentials layer from an AccessToken ref. Loads its `source` (host), `account`, `token`. */
  static fromAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken>) =>
    Layer.effect(
      JmapCredentials,
      Effect.gen(function* () {
        const accessToken = yield* Database.load(accessTokenRef);
        log('using access token', { source: accessToken.source });
        return { host: accessToken.source, account: accessToken.account, token: accessToken.token };
      }),
    );

  /** Creates a credentials layer from a Connection ref. Loads its `accessToken`'s host/account/token. */
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
    Layer.effect(
      JmapCredentials,
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const accessToken = yield* Database.load(connection.accessToken);
        log('using connection access token', { source: accessToken.source });
        return { host: accessToken.source, account: accessToken.account, token: accessToken.token };
      }),
    );

  /** Creates a credentials layer from explicit values (credential-form validation and tests). */
  static fromValues = (values: { host: string; account?: string; token: string }) =>
    Layer.succeed(JmapCredentials, { host: values.host, account: values.account, token: values.token });
}

//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Ref, Database } from '@dxos/echo';
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
 * Mirrors `GoogleCredentials` (the Trello pattern): the `Connection` owns the `AccessToken`, and
 * sync/send ops compose `fromConnection(ref)` once at the operation boundary. Unlike Google, there
 * is no database-credential fallback — a JMAP connection always carries host + token in its token
 * record.
 */
export class JmapCredentials extends Context.Tag('JmapCredentials')<JmapCredentials, Credentials>() {
  /**
   * Creates a credentials layer from a Connection ref. Loads the connection's `accessToken` and
   * reads its `source` (host), `account`, and `token`.
   */
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

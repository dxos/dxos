//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Filter, Obj, type Ref, type Type } from '@dxos/echo';
import { CredentialsService } from '@dxos/functions';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type AccessToken } from '@dxos/types';

import * as Calendar from '../../types/Calendar';
import * as Mailbox from '../../types/Mailbox';

/**
 * Creates the service interface from a cached token.
 * Falls back to database credentials if no cached token is provided.
 */
const makeService = (cachedToken: string | undefined): Context.Tag.Service<GoogleCredentials> => ({
  get: () =>
    cachedToken
      ? Effect.succeed(cachedToken)
      : Effect.map(CredentialsService.getCredential({ service: 'google.com' }), (c) => c.apiKey!),
});

/**
 * Loads access token from a ref if available.
 */
const loadAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken> | undefined, label: string) =>
  Effect.gen(function* () {
    if (accessTokenRef) {
      const accessToken = yield* Database.load(accessTokenRef);
      if (accessToken?.token) {
        log(`using ${label}-specific access token`, { note: accessToken.note });
        return accessToken.token;
      }
    }
    return undefined;
  });

/**
 * Queries for a config that references the given feed and extracts the access token.
 */
const loadTokenFromConfig = <T extends Mailbox.Config | Calendar.Config>(
  feedRef: Ref.Ref<Type.Feed>,
  configFilter: Filter.Any,
  label: string,
) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(feedRef);
    const configs = yield* Database.runQuery(configFilter);
    // TODO(wittjosiah): Not possible to filter by references yet.
    const config = configs.find((config: T) => DXN.equals(config.feed.dxn, Obj.getDXN(feed)));
    return yield* loadAccessToken(config?.accessToken, label);
  });

/**
 * Service for accessing Google API credentials.
 * Provides the Google API token either from a config's access token or falls back to database credentials.
 */
export class GoogleCredentials extends Context.Tag('GoogleCredentials')<
  GoogleCredentials,
  {
    /** Returns the Google API token. */
    get: () => Effect.Effect<string, never, CredentialsService>;
  }
>() {
  /**
   * Creates a credentials layer by querying for the mailbox config that references the given feed.
   */
  static fromMailbox = (feedRef: Ref.Ref<Type.Feed>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.map(loadTokenFromConfig<Mailbox.Config>(feedRef, Filter.type(Mailbox.Config), 'mailbox'), makeService),
    );

  /**
   * Creates a credentials layer by querying for the calendar config that references the given feed.
   */
  static fromCalendar = (feedRef: Ref.Ref<Type.Feed>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.map(loadTokenFromConfig<Calendar.Config>(feedRef, Filter.type(Calendar.Config), 'calendar'), makeService),
    );

  /**
   * Default layer that uses database credentials.
   * Use this for operations that don't have an associated config.
   */
  static default = Layer.succeed(GoogleCredentials, makeService(undefined));

  /** Convenience accessor - returns the Google API token. */
  static get = () => Effect.flatMap(GoogleCredentials, (service) => service.get());
}

//
// Copyright 2024 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, type Ref } from '@dxos/echo';
import { CredentialsService } from '@dxos/functions';
import { log } from '@dxos/log';
import { type AccessToken } from '@dxos/types';

import type * as Channel from '../../types/Channel';

/**
 * Creates the service interface from a cached token.
 * Falls back to database credentials if no cached token is provided.
 */
const makeService = (cachedToken: string | undefined): Context.Tag.Service<GoogleCredentials> => ({
  get: () =>
    cachedToken
      ? Effect.succeed(cachedToken)
      : Effect.map(CredentialsService.getCredential({ service: 'google.com' }), (credential) => credential.apiKey!),
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
 * Service for accessing Google API credentials.
 * Provides the Google API token either from an object's access token or falls back to database credentials.
 */
export class GoogleCredentials extends Context.Tag('GoogleCredentials')<
  GoogleCredentials,
  {
    /** Returns the Google API token. */
    get: () => Effect.Effect<string, never, CredentialsService>;
  }
>() {
  /**
   * Creates a credentials layer from a channel.
   * Pre-loads the access token during layer construction.
   */
  static fromChannel = (channel: Channel.YouTubeChannel) =>
    Layer.effect(GoogleCredentials, Effect.map(loadAccessToken(channel.accessToken, 'channel'), makeService));

  /**
   * Creates a credentials layer from a channel ref.
   * Loads the channel and pre-loads the access token during layer construction.
   */
  static fromChannelRef = (channelRef: Ref.Ref<Channel.YouTubeChannel>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.flatMap(Database.load(channelRef), (channel) =>
        Effect.map(loadAccessToken(channel.accessToken, 'channel'), makeService),
      ),
    );

  /**
   * Default layer that uses database credentials.
   * Use this for operations that don't have an associated channel.
   */
  static default = Layer.succeed(GoogleCredentials, makeService(undefined));

  /** Convenience accessor - returns the Google API token. */
  static get = () => Effect.flatMap(GoogleCredentials, (service) => service.get());
}

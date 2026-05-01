//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type AccessToken } from '@dxos/types';

import type * as Trello from '../types/Trello';

/** Auth params for Trello API requests. */
export type TrelloAuth = { apiKey: string; apiToken: string };

/**
 * Service for accessing Trello API credentials.
 * Provides the API key and token from a board's AccessToken ref.
 * The AccessToken `account` field stores the API key, and `token` stores the API token.
 */
export class TrelloCredentials extends Context.Tag('TrelloCredentials')<
  TrelloCredentials,
  {
    /** Returns the Trello auth credentials (apiKey + apiToken), or fails if no access token is configured on the board. */
    get: () => Effect.Effect<TrelloAuth, Error>;
  }
>() {
  /**
   * Creates a credentials layer from a board object ref.
   */
  static fromBoard = (boardRef: Ref.Ref<Trello.TrelloBoard>) =>
    Layer.effect(
      TrelloCredentials,
      Effect.gen(function* () {
        const board = yield* Database.load(boardRef);
        const token = yield* loadAccessToken(board.accessToken);
        return makeService(token);
      }),
    );

  /** Convenience accessor - returns the Trello auth credentials. */
  static get = () => Effect.flatMap(TrelloCredentials, (service) => service.get());
}

/** Loads access token from a ref if available. */
const loadAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken> | undefined) =>
  Effect.gen(function* () {
    if (accessTokenRef) {
      const accessToken = yield* Database.load(accessTokenRef);
      if (accessToken?.account && accessToken?.token) {
        log('using board-specific access token', { note: accessToken.note });
        return { apiKey: accessToken.account, apiToken: accessToken.token };
      }
    }
    return undefined;
  });

/** Creates the service interface from credentials. */
const makeService = (auth: TrelloAuth | undefined): Context.Tag.Service<TrelloCredentials> => ({
  get: () =>
    auth
      ? Effect.succeed(auth)
      : Effect.fail(new Error('Trello API credentials not configured. Add an AccessToken to the board.')),
});

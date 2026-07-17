//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ChessComNotFoundError, ChessComRequestError } from '../errors';
import * as ChessComAccount from '../types/ChessComAccount';

/** Base URL for the Chess.com Published (JSON) API. */
const CHESS_COM_API_BASE = 'https://api.chess.com/pub';

/** Upper bound on a single chess.com request; archives are fetched sequentially, so a hung request would otherwise stall the whole sync. */
const REQUEST_TIMEOUT = '30 seconds';

const ChessComGamePlayer = Schema.Struct({
  'rating': Schema.Number,
  'result': Schema.String,
  '@id': Schema.String,
  'username': Schema.String,
  'uuid': Schema.String,
});

const ChessComGame = Schema.Struct({
  url: Schema.String,
  pgn: Schema.String,
  time_control: Schema.optional(Schema.String),
  end_time: Schema.optional(Schema.Number),
  rated: Schema.optional(Schema.Boolean),
  uuid: Schema.String,
  initial_setup: Schema.optional(Schema.String),
  fen: Schema.optional(Schema.String),
  time_class: Schema.optional(Schema.String),
  rules: Schema.optional(Schema.String),
  white: ChessComGamePlayer,
  black: ChessComGamePlayer,
  eco: Schema.optional(Schema.String),
});

const ChessComGamesResponse = Schema.Struct({
  games: Schema.Array(ChessComGame),
});

const ChessComArchivesResponse = Schema.Struct({
  archives: Schema.Array(Schema.String),
});

const ChessComPlayer = Schema.Struct({
  'player_id': Schema.Number,
  '@id': Schema.String,
  'url': Schema.String,
  'username': Schema.String,
  'followers': Schema.Number,
  'country': Schema.optional(Schema.String),
  'last_online': Schema.optional(Schema.Number),
  'joined': Schema.optional(Schema.Number),
  'status': Schema.optional(Schema.String),
  'is_streamer': Schema.optional(Schema.Boolean),
  'verified': Schema.optional(Schema.Boolean),
  'league': Schema.optional(Schema.String),
  'streaming_platforms': Schema.optional(Schema.Array(Schema.String)),
});

export type RemoteGame = Schema.Schema.Type<typeof ChessComGame>;

const getJson = <A, I>(
  url: string,
  schema: Schema.Schema<A, I>,
): Effect.Effect<A, ChessComNotFoundError | ChessComRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const response = yield* HttpClientRequest.get(url).pipe(HttpClient.execute);
    if (response.status === 404) {
      return yield* Effect.fail(new ChessComNotFoundError({ url }));
    }
    if (response.status < 200 || response.status >= 300) {
      return yield* Effect.fail(new ChessComRequestError({ status: response.status, url }));
    }
    return yield* HttpClientResponse.schemaBodyJson(schema)(response);
  }).pipe(
    Effect.scoped,
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.mapError((cause) =>
      cause instanceof ChessComNotFoundError || cause instanceof ChessComRequestError
        ? cause
        : new ChessComRequestError({ url, cause }),
    ),
  );

/** Fetches player profile fields from the chess.com Published API. */
export const fetchPlayer = (
  username: string,
): Effect.Effect<ChessComAccount.AccountProfile, ChessComNotFoundError | ChessComRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const url = `${CHESS_COM_API_BASE}/player/${encodeURIComponent(username)}`;
    const player = yield* getJson(url, ChessComPlayer);
    return {
      playerId: player.player_id,
      profileUrl: player.url,
      followers: player.followers,
      country: player.country,
      lastOnline: player.last_online,
      joined: player.joined,
      status: player.status,
      isStreamer: player.is_streamer,
      verified: player.verified,
      league: player.league,
      streamingPlatforms: player.streaming_platforms ? [...player.streaming_platforms] : undefined,
    } satisfies ChessComAccount.AccountProfile;
  });

/** Lists monthly archive URLs for a player. */
export const fetchArchives = (
  username: string,
): Effect.Effect<readonly string[], ChessComNotFoundError | ChessComRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const url = `${CHESS_COM_API_BASE}/player/${encodeURIComponent(username)}/games/archives`;
    const response = yield* getJson(url, ChessComArchivesResponse);
    return response.archives;
  });

/** Fetches games for a single monthly archive URL. */
export const fetchArchiveGames = (
  archiveUrl: string,
): Effect.Effect<readonly RemoteGame[], ChessComNotFoundError | ChessComRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const response = yield* getJson(archiveUrl, ChessComGamesResponse);
    return response.games;
  });

/** Fetches all archived games for a player (sequential archive requests per API guidance). */
export const fetchAllGames = (
  username: string,
): Effect.Effect<readonly RemoteGame[], ChessComNotFoundError | ChessComRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const archives = yield* fetchArchives(username);
    const games: RemoteGame[] = [];
    for (const archiveUrl of archives) {
      const monthGames = yield* fetchArchiveGames(archiveUrl);
      games.push(...monthGames);
    }
    return games;
  });

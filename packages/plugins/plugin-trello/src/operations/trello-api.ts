//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

const TRELLO_API_BASE = 'https://api.trello.com/1';

/** Auth params appended to every Trello request. */
type TrelloAuth = { apiKey: string; apiToken: string };

const withAuth = (request: HttpClientRequest.HttpClientRequest, auth: TrelloAuth) =>
  HttpClientRequest.setUrlParams(request, { key: auth.apiKey, token: auth.apiToken });

/** Trello board response shape. */
export const TrelloBoardResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  closed: Schema.Boolean,
});

/** Trello list response shape. */
export const TrelloListResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  pos: Schema.Number,
  closed: Schema.Boolean,
});

/** Trello label response shape. */
export const TrelloLabelResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  color: Schema.optional(Schema.NullOr(Schema.String)),
});

/** Trello member response shape. */
export const TrelloMemberResponse = Schema.Struct({
  id: Schema.String,
  fullName: Schema.optional(Schema.String),
  username: Schema.optional(Schema.String),
  avatarUrl: Schema.optional(Schema.NullOr(Schema.String)),
});

/** Trello card response shape. */
export const TrelloCardResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  desc: Schema.optional(Schema.String),
  idList: Schema.String,
  pos: Schema.Number,
  due: Schema.optional(Schema.NullOr(Schema.String)),
  dueComplete: Schema.optional(Schema.Boolean),
  labels: Schema.optional(Schema.Array(TrelloLabelResponse)),
  members: Schema.optional(Schema.Array(TrelloMemberResponse)),
  url: Schema.optional(Schema.String),
  closed: Schema.optional(Schema.Boolean),
  dateLastActivity: Schema.optional(Schema.String),
});

export type TrelloCardResponse = Schema.Schema.Type<typeof TrelloCardResponse>;

/** Fetches board metadata. */
export const getBoard = (boardId: string, auth: TrelloAuth) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(`${TRELLO_API_BASE}/boards/${boardId}`);
    const response = yield* client.execute(withAuth(request, auth));
    const json = yield* response.json;
    return yield* Schema.decodeUnknown(TrelloBoardResponse)(json);
  });

/** Fetches all open lists for a board. */
export const getLists = (boardId: string, auth: TrelloAuth) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(`${TRELLO_API_BASE}/boards/${boardId}/lists`);
    const response = yield* client.execute(withAuth(HttpClientRequest.setUrlParams(request, { filter: 'open' }), auth));
    const json = yield* response.json;
    return yield* Schema.decodeUnknown(Schema.Array(TrelloListResponse))(json);
  });

/** Fetches all cards for a board with members. */
export const getCards = (boardId: string, auth: TrelloAuth) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(`${TRELLO_API_BASE}/boards/${boardId}/cards`);
    const response = yield* client.execute(
      withAuth(HttpClientRequest.setUrlParams(request, { members: 'true', filter: 'open' }), auth),
    );
    const json = yield* response.json;
    return yield* Schema.decodeUnknown(Schema.Array(TrelloCardResponse))(json);
  });

/** Updates a card's name on Trello. */
export const updateCard = (cardId: string, fields: Record<string, string>, auth: TrelloAuth) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.put(`${TRELLO_API_BASE}/cards/${cardId}`);
    const response = yield* client.execute(withAuth(HttpClientRequest.setUrlParams(request, fields), auth));
    const json = yield* response.json;
    return yield* Schema.decodeUnknown(TrelloCardResponse)(json);
  });

/** Moves a card to a different list on Trello. */
export const moveCard = (cardId: string, listId: string, auth: TrelloAuth) =>
  updateCard(cardId, { idList: listId }, auth);

/** Creates a new card on Trello. */
export const createCard = (listId: string, name: string, auth: TrelloAuth) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(`${TRELLO_API_BASE}/cards`);
    const response = yield* client.execute(withAuth(HttpClientRequest.setUrlParams(request, { idList: listId, name }), auth));
    const json = yield* response.json;
    return yield* Schema.decodeUnknown(TrelloCardResponse)(json);
  });

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { FreeqConnectionError } from '../errors';

const FreeqRestMessage = Schema.Struct({
  id: Schema.String,
  nick: Schema.String,
  text: Schema.String,
  ts: Schema.Number,
});

export type FreeqRestMessage = Schema.Schema.Type<typeof FreeqRestMessage>;

const RestPayload = Schema.Struct({ messages: Schema.optional(Schema.Array(FreeqRestMessage)) });

/** Derives the REST/HTTP base from a freeq WebSocket URL (`wss` → `https`, `ws` → `http`). */
export const httpBaseFromWs = (serverUrl: string): string => serverUrl.replace(/^ws(s?):\/\//, 'http$1://');

/** Fetches recent channel history from the read-only freeq REST API. */
export const getMessages = (options: {
  httpBase: string;
  channel: string;
}): Effect.Effect<ReadonlyArray<FreeqRestMessage>, FreeqConnectionError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    // `filterStatusOk` rejects a non-2xx response as a `ResponseError` (carrying `status`)
    // before the body is decoded, so a 4xx/5xx is reported as a connection failure rather
    // than misreported as a schema-decode error against an error-envelope body.
    const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
    const name = options.channel.replace(/^#/, '');
    const request = HttpClientRequest.get(`${options.httpBase}/api/v1/channels/${encodeURIComponent(name)}/messages`);
    const response = yield* client.execute(request);
    const payload = yield* HttpClientResponse.schemaBodyJson(RestPayload)(response);
    return payload.messages ?? [];
  }).pipe(Effect.mapError((cause) => new FreeqConnectionError({ cause })));

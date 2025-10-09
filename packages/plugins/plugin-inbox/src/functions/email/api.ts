//
// Copyright 2025 DXOS.org
//

import { HttpClient, HttpClientRequest } from '@effect/platform';
import { Effect, Schedule, Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { withAuthorization } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { type Tag } from '../../types';

import { LabelsResponse, MessageDetails, MessagesResponse } from './types';
import { createUrl, getPart, parseFromHeader, stripNewlines, turndown } from './util';

// TODO(burdon): Evolve into general sync engine.

const API_URL = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Lists the labels in the user's mailbox.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list
 */
export const listLabels = Effect.fn(function* (userId: string) {
  const url = createUrl([API_URL, 'users', userId, 'labels']).toString();
  return yield* makeRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(LabelsResponse)));
});

/**
 * Lists the messages in the user's mailbox.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
 */
export const listMessages = Effect.fn(function* (
  userId: string,
  q: string,
  pageSize: number,
  pageToken?: string | undefined,
) {
  const url = createUrl([API_URL, 'users', userId, 'messages'], { q, pageSize, pageToken }).toString();
  return yield* makeRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(MessagesResponse)));
});

/**
 * Gets the specified message.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
 */
export const getMessage = Effect.fn(function* (userId: string, messageId: string) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId]).toString();
  return yield* makeRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(MessageDetails)));
});

/**
 * Transforms Gmail message to ECHO message object.
 */
export const messageToObject = (last?: DataType.Message, labelMap?: Map<string, Tag>) =>
  Effect.fn(function* (message: MessageDetails) {
    // Skip the message if it's the same as the last message.
    const created = new Date(parseInt(message.internalDate)).toISOString();
    if (created === last?.created) {
      return null;
    }

    const from = message.payload.headers.find(({ name }) => name === 'From');
    const sender = from && parseFromHeader(from.value);
    const data = message.payload.body?.data ?? getPart(message, 'text/html') ?? getPart(message, 'text/plain');

    // Skip the message if content or sender is missing.
    // TODO(wittjosiah): This comparison should be done via foreignId probably.
    if (!sender || !data) {
      return null;
    }

    // Normalize text.
    const text = Buffer.from(data, 'base64').toString('utf-8');
    const markdown = stripNewlines(turndown.turndown(text));

    const subject = message.payload.headers.find(({ name }) => name === 'Subject')?.value;
    const snippet = message.snippet;

    // TODO(burdon): Store labels by id.
    const labels = labelMap
      ? message.labelIds.map((labelId) => labelMap.get(labelId)).filter(Boolean)
      : message.labelIds;

    return Obj.make(DataType.Message, {
      id: Type.ObjectId.random(),
      created,
      sender,
      blocks: [
        {
          _tag: 'text',
          text: markdown,
        },
      ],
      properties: {
        threadId: message.threadId,
        labels,
        snippet,
        subject,
      },
    });
  });

/**
 * NOTE: Google API bundles size is v. large and caused runtime issues.
 */
// TODO(burdon): Factor out.
const makeRequest = Effect.fnUntraced(function* (url: string) {
  const httpClient = yield* HttpClient.HttpClient.pipe(
    Effect.map(withAuthorization({ service: 'gmail.com' }, 'Bearer')),
  );

  // TODO(wittjosiah): Without this, executing the request results in CORS errors when traced.
  //  Is this an issue on Google's side or is it a bug in `@effect/platform`?
  //  https://github.com/Effect-TS/effect/issues/4568
  const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

  const response = yield* HttpClientRequest.get(url).pipe(
    HttpClientRequest.setHeader('accept', 'application/json'),
    httpClientWithTracerDisabled.execute,
    Effect.flatMap((res) => res.json),
    Effect.timeout('1 second'),
    Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
    Effect.scoped,
  );

  // TODO(burdon): Handle errors (esp. 401).
  if ((response as any).error) {
    // throw new Error((response as any).error);
    log.catch((response as any).error);
  }

  return response;
});

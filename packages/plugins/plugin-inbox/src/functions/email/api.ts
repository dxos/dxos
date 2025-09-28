//
// Copyright 2025 DXOS.org
//

import { HttpClient, HttpClientRequest } from '@effect/platform';
import { Effect, Schedule, Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { withAuthorization } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { LabelsResponse, type Message, MessageDetails, MessagesResponse } from './types';

// TODO(burdon): Evolve into general sync engine.

const API_URL = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Lists the labels in the user's mailbox.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list
 */
export const listLabels = Effect.fn(function* (userId: string) {
  const url = getUrl([API_URL, 'users', userId, 'labels']).toString();
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
  const url = getUrl([API_URL, 'users', userId, 'messages'], { q, pageSize, pageToken }).toString();
  return yield* makeRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(MessagesResponse)));
});

/**
 * Gets the specified message.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
 */
export const getMessage = Effect.fn(function* (userId: string, messageId: string) {
  const url = getUrl([API_URL, 'users', userId, 'messages', messageId]).toString();
  return yield* makeRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(MessageDetails)));
});

/**
 * Transforms Gmail message to ECHO message object.
 */
export const messageToObject = (last?: DataType.Message, labelMap?: Map<string, string>) =>
  Effect.fn(function* (message: MessageDetails) {
    const created = new Date(parseInt(message.internalDate)).toISOString();
    const from = message.payload.headers.find(({ name }) => name === 'From');
    const sender = from && parseEmailString(from.value);

    // TODO(wittjosiah): Improve parsing of email contents.
    //  https://nodemailer.com/extras/mailparser
    const content =
      message.payload.body?.data ?? message.payload.parts?.find(({ mimeType }) => mimeType === 'text/plain')?.body.data;

    // Skip the message if content or sender is missing.
    // Skip the message if it's the same as the last message.
    // TODO(wittjosiah): This comparison should be done via foreignId probably.
    if (!sender || !content || created === last?.created) {
      return undefined;
    }

    const subject = message.payload.headers.find(({ name }) => name === 'Subject')?.value;
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
          text: Buffer.from(content, 'base64').toString('utf-8'),
        },
      ],
      properties: {
        threadId: message.threadId,
        labels,
        snippet: message.snippet,
        subject,
      },
    });
  });

//
// Utils
//

const getUrl = (parts: (string | undefined)[], params: Record<string, any> = {}): URL => {
  const url = new URL(parts.filter(Boolean).join('/'));
  Object.entries(params)
    .filter(([_, value]) => value != null)
    .forEach(([key, value]) => url.searchParams.set(key, value));

  return url;
};

/**
 * NOTE: Google API bundles size is v. large and caused runtime issues.
 */
const makeRequest = Effect.fnUntraced(function* (url: string) {
  const httpClient = yield* HttpClient.HttpClient.pipe(
    Effect.map(withAuthorization({ service: 'gmail.com' }, 'Bearer')), // TODO(burdon): Factor out.
  );

  // TODO(wittjosiah): Without this, executing the request results in CORS errors when traced.
  //   Is this an issue on Google's side or is it a bug in `@effect/platform`?
  //   https://github.com/Effect-TS/effect/issues/4568
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
  }

  return response;
});

const EMAIL_REGEX = /^([^<]+?)\s*<([^>]+@[^>]+)>$/;

// TODO(burdon): Factor out.
const parseEmailString = (emailString: string): { name?: string; email: string } | undefined => {
  const match = emailString.match(EMAIL_REGEX);
  if (match) {
    const [, name, email] = match;
    return {
      name: name.trim(),
      email: email.trim(),
    };
  }

  return undefined;
};

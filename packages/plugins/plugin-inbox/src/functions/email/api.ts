//
// Copyright 2025 DXOS.org
//

import { HttpClient, HttpClientRequest } from '@effect/platform';
import { Effect, Schedule, Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';
import { withAuthorization } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { LabelsResponse, type Message, MessageDetails, ListMessagesResponse as MessagesResponse } from './types';

// TODO(burdon): Evolve into general sync engine.

/**
 * Fetches all labels for a Gmail user.
 */
export const getLabels = Effect.fn(function* (userId: string) {
  const url = getUrl(['users', userId, 'labels']).toString();
  return yield* makeRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(LabelsResponse)));
});

/**
 * Fetches a Gmail messages.
 */
export const getMessages = Effect.fn(function* (
  userId: string,
  q: string,
  pageSize: number,
  pageToken: string | undefined,
) {
  const url = getUrl(['users', userId, 'messages'], { q, pageSize, pageToken }).toString();
  return yield* makeRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(MessagesResponse)));
});

/**
 * Fetches the details of a Gmail message.
 */
export const getMessage = Effect.fn(function* (userId: string, messageId: string) {
  const url = getUrl(['users', userId, 'messages', messageId]).toString();
  return yield* makeRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(MessageDetails)));
});

/**
 * Transforms a Gmail message to a ECHO message object.
 */
export const messageToObject = (userId: string, last?: DataType.Message, labelMap?: Map<string, string>) =>
  Effect.fn(function* (message: Message) {
    const messageDetails = yield* getMessage(userId, message.id);
    const created = new Date(parseInt(messageDetails.internalDate)).toISOString();
    const from = messageDetails.payload.headers.find((h) => h.name === 'From');
    const sender = from && parseEmailString(from.value);

    // TODO(wittjosiah): Improve parsing of email contents.
    const content =
      messageDetails.payload.body?.data ??
      messageDetails.payload.parts?.find((p) => p.mimeType === 'text/plain')?.body.data;

    // Skip the message if content or sender is missing.
    // Skip the message if it's the same as the last message.
    // TODO(wittjosiah): This comparison should be done via foreignId probably.
    if (!content || !sender || created === last?.created) {
      return undefined;
    }

    const subject = messageDetails.payload.headers.find((h) => h.name === 'Subject')?.value;
    const labels = labelMap
      ? messageDetails.labelIds.map((labelId) => labelMap.get(labelId)).filter(Boolean)
      : messageDetails.labelIds;

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
        subject,
        threadId: message.threadId,
        labels,
      },
    });
  });

//
// Utils
//

const getUrl = (parts: (string | undefined)[], params?: Record<string, any>): URL => {
  const url = new URL([`https://gmail.googleapis.com/gmail/v1`, ...parts].filter(Boolean).join('/'));
  Object.entries(params ?? {})
    .filter(([_, value]) => value != null)
    .forEach(([key, value]) => url.searchParams.set(key, value));

  return url;
};

/**
 * NOTE: Google API bundles size is v. large and caused runtime issues.
 */
const makeRequest = Effect.fnUntraced(function* (url: string) {
  const httpClient = yield* HttpClient.HttpClient.pipe(
    Effect.map(withAuthorization({ service: 'gmail.com' }, 'Bearer')),
  );

  // TODO(wittjosiah): Without this, executing the request results in CORS errors when traced.
  //   Is this an issue on Google's side or is it a bug in `@effect/platform`?
  //   https://github.com/Effect-TS/effect/issues/4568
  const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

  return yield* HttpClientRequest.get(url).pipe(
    HttpClientRequest.setHeader('accept', 'application/json'),
    httpClientWithTracerDisabled.execute,
    Effect.flatMap((res) => res.json),
    Effect.timeout('1 second'),
    Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
    Effect.scoped,
  );
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

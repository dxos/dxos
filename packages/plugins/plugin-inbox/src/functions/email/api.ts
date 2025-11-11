//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { Message } from '@dxos/types';

import { createUrl, makeGoogleApiRequest } from '../google-api';

import { LabelsResponse, MessageDetails, MessagesResponse } from './types';
import { getPart, normalizeText, parseFromHeader } from './util';

// TODO(burdon): Evolve into general sync engine.

/**
 * NOTE: Google API bundles size is v. large and caused runtime issues.
 */
const API_URL = 'https://gmail.googleapis.com/gmail/v1';

export const SYSTEM_LABELS = [
  'CATEGORY_PERSONAL',
  'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_UPDATES',
  'CATEGORY_FORUMS',
  'CHAT',
  'DRAFT',
  'INBOX',
  'IMPORTANT',
  'SENT',
  'SPAM',
  'STARRED',
  'TRASH',
  'UNREAD',
  'YELLOW_STAR',
];

// TODO(burdon): Factor out.
export const filterLabel = (label: string) => !SYSTEM_LABELS.includes(label);

/**
 * Lists the labels in the user's mailbox.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list
 */
export const listLabels = Effect.fn(function* (userId: string) {
  const url = createUrl([API_URL, 'users', userId, 'labels']).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(LabelsResponse)));
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
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(MessagesResponse)));
});

/**
 * Gets the specified message.
 * https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
 */
export const getMessage = Effect.fn(function* (userId: string, messageId: string) {
  const url = createUrl([API_URL, 'users', userId, 'messages', messageId]).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(MessageDetails)));
});

/**
 * Transforms Gmail message to ECHO message object.
 */
export const messageToObject = (last?: Message.Message) =>
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
    const text = normalizeText(Buffer.from(data, 'base64').toString('utf-8'));

    return Obj.make(
      Message.Message,
      {
        id: Type.ObjectId.random(),
        created,
        sender,
        blocks: [
          {
            _tag: 'text',
            text,
          },
        ],
        properties: {
          threadId: message.threadId,
          snippet: message.snippet,
          subject: message.payload.headers.find(({ name }) => name === 'Subject')?.value,
        },
      },
      {
        tags: [...message.labelIds],
      },
    );
  });

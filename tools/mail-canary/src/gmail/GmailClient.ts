//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type GmailCredentials, accessToken } from './auth.ts';
import { GmailError, request } from './request.ts';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

const MessagePage = Schema.Struct({
  messages: Schema.optional(Schema.Array(Schema.Struct({ id: Schema.String }))),
  nextPageToken: Schema.optional(Schema.String),
});
const RawMessage = Schema.Struct({ raw: Schema.String });
const MetadataMessage = Schema.Struct({
  id: Schema.String,
  internalDate: Schema.String,
  payload: Schema.optional(
    Schema.Struct({
      headers: Schema.optional(Schema.Array(Schema.Struct({ name: Schema.String, value: Schema.String }))),
    }),
  ),
});
const MessageRef = Schema.Struct({ id: Schema.String });
const Profile = Schema.Struct({ emailAddress: Schema.String });
const Label = Schema.Struct({ id: Schema.String, name: Schema.String });
const LabelList = Schema.Struct({ labels: Schema.optional(Schema.Array(Label)) });
const Empty = Schema.Struct({});

/** Header values of one message, as `messages.get?format=metadata` returns them. */
export type MessageMetadata = {
  readonly id: string;
  readonly internalDate: number;
  readonly headers: Readonly<Record<string, string>>;
};

/** The Gmail calls the canary makes, bound to one access token. Messages go in and out as RFC 5322 text. */
export class GmailClient {
  /** Signs in with the grant and fails unless it belongs to `account`, so a mis-pointed grant never writes. */
  static connect(credentials: GmailCredentials, account: string): Effect.Effect<GmailClient, GmailError> {
    return Effect.gen(function* () {
      const client = new GmailClient(yield* accessToken(credentials));
      const { emailAddress } = yield* client.#call(Profile, '/profile');
      if (emailAddress.toLowerCase() !== account.toLowerCase()) {
        return yield* new GmailError({ message: `token belongs to ${emailAddress}, expected ${account}` });
      }
      return client;
    });
  }

  readonly #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  /** Every message id matching a Gmail search, following pagination. */
  listIds(query: string): Effect.Effect<string[], GmailError> {
    return Effect.gen({ self: this }, function* () {
      const ids: string[] = [];
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({ q: query, maxResults: '500', ...(pageToken ? { pageToken } : {}) });
        const page = yield* this.#call(MessagePage, `/messages?${params}`);
        ids.push(...(page.messages ?? []).map((message) => message.id));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return ids;
    });
  }

  /** Exact count of messages matching a search, unlike the list's `resultSizeEstimate`. */
  count(query: string): Effect.Effect<number, GmailError> {
    return this.listIds(query).pipe(Effect.map((ids) => ids.length));
  }

  getMessage(id: string): Effect.Effect<string, GmailError> {
    return this.#call(RawMessage, `/messages/${id}?format=raw`).pipe(
      Effect.map((message) => Buffer.from(message.raw, 'base64url').toString('latin1')),
    );
  }

  getMetadata(id: string, headerNames: readonly string[]): Effect.Effect<MessageMetadata, GmailError> {
    const headers = headerNames.map((name) => `metadataHeaders=${name}`).join('&');
    return this.#call(MetadataMessage, `/messages/${id}?format=metadata&${headers}`).pipe(
      Effect.map((message) => ({
        id: message.id,
        internalDate: Number(message.internalDate),
        headers: Object.fromEntries((message.payload?.headers ?? []).map((header) => [header.name, header.value])),
      })),
    );
  }

  /** Inserts a message without sending it; `receivedTime` makes its internal date the insert time. */
  insert(message: string, labelIds: readonly string[]): Effect.Effect<string, GmailError> {
    return this.#post('/messages?internalDateSource=receivedTime', { raw: encode(message), labelIds });
  }

  /**
   * Imports a message as received mail: no inbox unless asked, never spam, and the internal date
   * taken from its `Date` header, so an old pool message stays outside the sync window.
   */
  importMessage(message: string, labelIds: readonly string[]): Effect.Effect<string, GmailError> {
    return this.#post('/messages/import?internalDateSource=dateHeader&neverMarkSpam=true&processForCalendar=false', {
      raw: encode(message),
      labelIds,
    });
  }

  trash(id: string): Effect.Effect<void, GmailError> {
    return this.#call(MessageRef, `/messages/${id}/trash`, { method: 'POST' }).pipe(Effect.asVoid);
  }

  /** The id of a user label, created when it does not exist yet. */
  ensureLabel(name: string): Effect.Effect<string, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const { labels } = yield* this.#call(LabelList, '/labels');
      const existing = labels?.find((label) => label.name === name);
      if (existing) {
        return existing.id;
      }
      const created = yield* this.#call(Label, '/labels', { method: 'POST', body: JSON.stringify({ name }) });
      return created.id;
    });
  }

  /** Deletes every label whose name starts with `prefix`; its messages keep their other labels. */
  deleteLabels(prefix: string): Effect.Effect<number, GmailError> {
    return Effect.gen({ self: this }, function* () {
      const { labels } = yield* this.#call(LabelList, '/labels');
      const matching = (labels ?? []).filter((label) => label.name.startsWith(prefix));
      yield* Effect.forEach(matching, (label) => this.#call(Empty, `/labels/${label.id}`, { method: 'DELETE' }), {
        discard: true,
      });
      return matching.length;
    });
  }

  #post(path: string, body: unknown): Effect.Effect<string, GmailError> {
    return this.#call(MessageRef, path, { method: 'POST', body: JSON.stringify(body) }).pipe(
      Effect.map((message) => message.id),
    );
  }

  #call<S extends Schema.Top>(schema: S, path: string, init: RequestInit = {}) {
    return request(schema, `${API}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.#token}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
    });
  }
}

// Latin-1 round-trips every byte, so an 8-bit body survives decode and re-encode unchanged.
const encode = (message: string): string => Buffer.from(message, 'latin1').toString('base64url');

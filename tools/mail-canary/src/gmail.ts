//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/** A failed Gmail or Google OAuth call. */
export class GmailError extends Data.TaggedError('GmailError')<{
  readonly message: string;
  readonly status?: number;
}> {}

/**
 * The test account's own OAuth grant (a Desktop client and a refresh token with `gmail.modify`).
 * The canary runs outside EDGE, so it cannot use the kms-managed token the sync uses.
 */
export type GmailCredentials = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
};

/** Reads the grant from `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` and `GMAIL_REFRESH_TOKEN`. */
export const credentialsFromEnv = (env = process.env): GmailCredentials | undefined =>
  env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN
    ? { clientId: env.GMAIL_CLIENT_ID, clientSecret: env.GMAIL_CLIENT_SECRET, refreshToken: env.GMAIL_REFRESH_TOKEN }
    : undefined;

const TokenResponse = Schema.Struct({ access_token: Schema.String });
const MessagePage = Schema.Struct({
  messages: Schema.optional(Schema.Array(Schema.Struct({ id: Schema.String }))),
  nextPageToken: Schema.optional(Schema.String),
});
const RawMessage = Schema.Struct({ raw: Schema.String });
const MetadataMessage = Schema.Struct({
  id: Schema.String,
  internalDate: Schema.String,
  labelIds: Schema.optional(Schema.Array(Schema.String)),
  payload: Schema.optional(
    Schema.Struct({
      headers: Schema.optional(Schema.Array(Schema.Struct({ name: Schema.String, value: Schema.String }))),
    }),
  ),
});
const MessageRef = Schema.Struct({ id: Schema.String });
const Label = Schema.Struct({ id: Schema.String, name: Schema.String, messagesTotal: Schema.optional(Schema.Number) });
const LabelList = Schema.Struct({ labels: Schema.optional(Schema.Array(Label)) });

const request = <S extends Schema.Top>(
  schema: S,
  url: string,
  init: RequestInit = {},
): Effect.Effect<S['Type'], GmailError, S['DecodingServices']> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url, init);
      const body: unknown = response.status === 204 ? {} : await response.json();
      if (!response.ok) {
        throw new GmailError({
          message: `${url} → ${response.status}: ${JSON.stringify(body)}`,
          status: response.status,
        });
      }
      return body;
    },
    catch: (cause) => (cause instanceof GmailError ? cause : new GmailError({ message: String(cause) })),
  }).pipe(
    Effect.flatMap((body) =>
      Schema.decodeUnknownEffect(schema)(body).pipe(
        Effect.mapError((error) => new GmailError({ message: `unexpected response from ${url}: ${error.message}` })),
      ),
    ),
  );

/** Mints an access token from the refresh token. */
export const accessToken = ({ clientId, clientSecret, refreshToken }: GmailCredentials) =>
  request(TokenResponse, 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  }).pipe(Effect.map((body) => body.access_token));

/** Header values of one message, as `messages.get?format=metadata` returns them. */
export type MessageMetadata = {
  readonly id: string;
  readonly internalDate: number;
  readonly labelIds: readonly string[];
  readonly headers: Readonly<Record<string, string>>;
};

/** The Gmail calls the canary makes, bound to one access token. */
export const makeGmail = (token: string) => {
  const call = <S extends Schema.Top>(schema: S, path: string, init: RequestInit = {}) =>
    request(schema, `${API}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
    });

  /** Every message id matching a Gmail search, following pagination. */
  const listIds = (query: string): Effect.Effect<string[], GmailError> =>
    Effect.gen(function* () {
      const ids: string[] = [];
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({ q: query, maxResults: '500', ...(pageToken ? { pageToken } : {}) });
        const page = yield* call(MessagePage, `/messages?${params}`);
        ids.push(...(page.messages ?? []).map((message) => message.id));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return ids;
    });

  const getRaw = (id: string): Effect.Effect<string, GmailError> =>
    call(RawMessage, `/messages/${id}?format=raw`).pipe(Effect.map((message) => message.raw));

  const getMetadata = (id: string, headerNames: readonly string[]): Effect.Effect<MessageMetadata, GmailError> =>
    call(
      MetadataMessage,
      `/messages/${id}?format=metadata&${headerNames.map((name) => `metadataHeaders=${name}`).join('&')}`,
    ).pipe(
      Effect.map((message) => ({
        id: message.id,
        internalDate: Number(message.internalDate),
        labelIds: message.labelIds ?? [],
        headers: Object.fromEntries((message.payload?.headers ?? []).map((header) => [header.name, header.value])),
      })),
    );

  /** Inserts a raw message without sending it; `receivedTime` makes its internal date the insert time. */
  const insert = (raw: string, labelIds: readonly string[]): Effect.Effect<string, GmailError> =>
    call(MessageRef, '/messages?internalDateSource=receivedTime', {
      method: 'POST',
      body: JSON.stringify({ raw, labelIds }),
    }).pipe(Effect.map((message) => message.id));

  const trash = (id: string): Effect.Effect<void, GmailError> =>
    call(MessageRef, `/messages/${id}/trash`, { method: 'POST' }).pipe(Effect.asVoid);

  /** The id of a user label, created when it does not exist yet. */
  const ensureLabel = (name: string): Effect.Effect<string, GmailError> =>
    Effect.gen(function* () {
      const { labels } = yield* call(LabelList, '/labels');
      const existing = labels?.find((label) => label.name === name);
      if (existing) {
        return existing.id;
      }
      const created = yield* call(Label, '/labels', { method: 'POST', body: JSON.stringify({ name }) });
      return created.id;
    });

  /** Exact message count of a label, unlike a search's estimate. */
  const labelTotal = (labelId: string): Effect.Effect<number, GmailError> =>
    call(Label, `/labels/${labelId}`).pipe(Effect.map((label) => label.messagesTotal ?? 0));

  /** Count of messages matching a search, by listing them; exact, unlike `resultSizeEstimate`. */
  const count = (query: string): Effect.Effect<number, GmailError> =>
    listIds(query).pipe(Effect.map((ids) => ids.length));

  return { listIds, getRaw, getMetadata, insert, trash, ensureLabel, labelTotal, count };
};

export type Gmail = ReturnType<typeof makeGmail>;

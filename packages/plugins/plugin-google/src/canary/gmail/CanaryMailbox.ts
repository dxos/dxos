//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as Schedule from 'effect/Schedule';

import { configuredCredentialsLayer } from '@dxos/compute-runtime';

import { GoogleCredentials, GoogleMailApi, type GoogleMailApiError, type GoogleMailApiService } from '#services';

import { GOOGLE_INTEGRATION_SOURCE } from '../../constants.ts';
import { CanaryError } from '../errors.ts';
import { type GmailCredentials, accessToken } from './auth.ts';

const USER = 'me';

// Gmail's own page limit for `messages.list`.
const PAGE_SIZE = 500;

/** Header values of one message, as its full `messages.get` returns them. */
export type MessageMetadata = {
  readonly id: string;
  readonly internalDate: number;
  readonly headers: Readonly<Record<string, string>>;
};

export type CanaryMailboxError = GoogleMailApiError | CanaryError;

/**
 * The test account's mailbox, over plugin-google's {@link GoogleMailApi}. It adds what the canary needs
 * on top of the raw calls: messages as RFC 5322 text rather than base64url, labels by name, searches
 * paged to the end, and retries on Gmail's per-user quota, which a nightly burst of inserts reaches.
 */
export class CanaryMailbox {
  /** Signs in with the grant and fails unless it belongs to `account`, so a mis-pointed grant never writes. */
  static connect = Effect.fn('mail-canary.CanaryMailbox.connect')(function* (
    credentials: GmailCredentials,
    account: string,
  ) {
    const token = yield* accessToken(credentials);
    const mailbox = new CanaryMailbox(yield* GoogleMailApi.pipe(Effect.provide(liveApi(token))));
    const { emailAddress } = yield* mailbox.#call((api) => api.getProfile(USER));
    if (emailAddress?.toLowerCase() !== account.toLowerCase()) {
      return yield* new CanaryError({ message: `token belongs to ${emailAddress}, expected ${account}` });
    }
    return mailbox;
  });

  readonly #api: GoogleMailApiService;

  constructor(api: GoogleMailApiService) {
    this.#api = api;
  }

  /** Every message id matching a Gmail search. */
  listIds(query: string): Effect.Effect<string[], CanaryMailboxError> {
    return Effect.gen({ self: this }, function* () {
      const ids: string[] = [];
      let pageToken: string | undefined;
      do {
        const page = yield* this.#call((api) => api.listMessages(USER, query, PAGE_SIZE, pageToken));
        ids.push(...(page.messages ?? []).map((message) => message.id));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return ids;
    });
  }

  /** Exact count of messages matching a search, unlike the list's `resultSizeEstimate`. */
  count(query: string): Effect.Effect<number, CanaryMailboxError> {
    return this.listIds(query).pipe(Effect.map((ids) => ids.length));
  }

  getMessage(id: string): Effect.Effect<string, CanaryMailboxError> {
    return this.#call((api) => api.getRawMessage(USER, id)).pipe(Effect.map((message) => decode(message.raw)));
  }

  /** The named headers, keyed by the names asked for, since header names are case-insensitive and Gmail keeps the sender's case. */
  getMetadata(id: string, headerNames: readonly string[]): Effect.Effect<MessageMetadata, CanaryMailboxError> {
    return this.#call((api) => api.getMessage(USER, id)).pipe(
      Effect.map((message) => ({
        id: message.id,
        internalDate: Number(message.internalDate),
        headers: Object.fromEntries(
          headerNames.flatMap((name) => {
            const header = message.payload.headers.find((header) => header.name.toLowerCase() === name.toLowerCase());
            return header ? [[name, header.value]] : [];
          }),
        ),
      })),
    );
  }

  /** Inserts a message as if delivered now, without sending it. */
  insert(message: string, labelIds: readonly string[]): Effect.Effect<string, CanaryMailboxError> {
    return this.#call((api) => api.insertMessage(USER, { raw: encode(message), labelIds })).pipe(
      Effect.map((ref) => ref.id),
    );
  }

  /** Imports a message as received mail, dated by its own `Date` header, so an old message stays old. */
  importMessage(message: string, labelIds: readonly string[]): Effect.Effect<string, CanaryMailboxError> {
    return this.#call((api) => api.importMessage(USER, { raw: encode(message), labelIds })).pipe(
      Effect.map((ref) => ref.id),
    );
  }

  trash(id: string): Effect.Effect<void, CanaryMailboxError> {
    return this.#call((api) => api.trashMessage(USER, id)).pipe(Effect.asVoid);
  }

  /** The id of a user label, created when it does not exist yet. */
  ensureLabel(name: string): Effect.Effect<string, CanaryMailboxError> {
    return Effect.gen({ self: this }, function* () {
      const { labels } = yield* this.#call((api) => api.listLabels(USER));
      const existing = labels.find((label) => label.name === name);
      return existing ? existing.id : (yield* this.#call((api) => api.createLabel(USER, name))).id;
    });
  }

  /** Deletes every label whose name starts with `prefix`; its messages keep their other labels. */
  deleteLabels(prefix: string): Effect.Effect<number, CanaryMailboxError> {
    return Effect.gen({ self: this }, function* () {
      const { labels } = yield* this.#call((api) => api.listLabels(USER));
      const matching = labels.filter((label) => label.name.startsWith(prefix));
      yield* Effect.forEach(matching, (label) => this.#call((api) => api.deleteLabel(USER, label.id)), {
        discard: true,
      });
      return matching.length;
    });
  }

  // `makeGoogleApiRequest` retries only transport failures; Gmail's 429 and odd 5xx clear on their own.
  #call<A>(
    call: (api: GoogleMailApiService) => Effect.Effect<A, GoogleMailApiError>,
  ): Effect.Effect<A, GoogleMailApiError> {
    return call(this.#api).pipe(
      Effect.retry({
        while: isTransient,
        schedule: Schedule.exponential('1 second'),
        times: 6,
      }),
    );
  }
}

/**
 * Gmail's per-user quota (429) and its odd 5xx. Read off `GoogleApiError.code` by shape, since the setup
 * scripts run under Node's type stripping, which cannot load that class's parameter properties.
 */
const isTransient = (error: GoogleMailApiError): boolean =>
  Predicate.hasProperty(error, 'code') && typeof error.code === 'number' && (error.code === 429 || error.code >= 500);

/** The live API, authenticated with one access token rather than a space's stored connection. */
const liveApi = (token: string): Layer.Layer<GoogleMailApi> =>
  GoogleMailApi.Live.pipe(
    Layer.provide(GoogleCredentials.default),
    Layer.provide(configuredCredentialsLayer([{ service: GOOGLE_INTEGRATION_SOURCE, apiKey: token }])),
    Layer.provide(FetchHttpClient.layer),
  );

// Latin-1 round-trips every byte, so an 8-bit body survives decode and re-encode unchanged.
const encode = (message: string): string => Buffer.from(message, 'latin1').toString('base64url');
const decode = (raw: string): string => Buffer.from(raw, 'base64url').toString('latin1');

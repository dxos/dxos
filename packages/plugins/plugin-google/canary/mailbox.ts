//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import type * as HttpClient from 'effect/http/HttpClient';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { configuredCredentialsLayer } from '@dxos/compute-runtime';
import type * as Credential from '@dxos/compute/Credential';

import { GoogleCredentials, GoogleMailApi, type GoogleMailApiError, type GoogleMailApiService } from '#services';

import { makeGoogleApiRequest } from '../src/apis/google-api.ts';
import { GOOGLE_INTEGRATION_SOURCE } from '../src/constants.ts';
import { GoogleApiError } from '../src/errors.ts';
import { LIVE_GMAIL_ACCOUNT } from '../src/testing/live-credentials.ts';

/** A failure of the canary's own making: bad settings, a wrong account, a space it cannot read. */
export class CanaryError extends Data.TaggedError('CanaryError')<{ readonly message: string }> {}

/** The test account's own grant (`gmail.modify`); the canary runs outside EDGE, so not the kms token. */
export type GmailCredentials = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
};

/** The only mailbox the canary may write to. */
export const CANARY_ACCOUNT = LIVE_GMAIL_ACCOUNT;

/** The only label the canary puts on the test account's mail. */
export const POOL_LABEL = 'enron-pool';

export const credentialsFromEnv = (env = process.env): GmailCredentials | undefined =>
  env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN
    ? { clientId: env.GMAIL_CLIENT_ID, clientSecret: env.GMAIL_CLIENT_SECRET, refreshToken: env.GMAIL_REFRESH_TOKEN }
    : undefined;

export type MailboxError = GoogleMailApiError | CanaryError;

/** Calls plugin-google has no `GoogleMailApi` method for, made through its own `makeGoogleApiRequest`. */
type Request = (path: string, init?: { method?: string; body?: string }) => Effect.Effect<unknown, GoogleMailApiError>;

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const Ref = Schema.Struct({ id: Schema.String });
const Raw = Schema.Struct({ raw: Schema.String });

/**
 * The test account's mailbox over plugin-google's Gmail client. It adds only what the canary needs:
 * RFC 5322 text in and out, labels by name, searches paged to the end, and retries on Gmail's quota.
 */
export class CanaryMailbox {
  /** Signs in and fails unless the grant belongs to the canary account, so a mis-pointed grant never writes. */
  static connect = Effect.fn('mail-canary.CanaryMailbox.connect')(function* (credentials: GmailCredentials) {
    const context = yield* Effect.context<Requirements>().pipe(
      Effect.provide(requirements(yield* accessToken(credentials))),
    );
    const api = yield* GoogleMailApi.pipe(Effect.provide(GoogleMailApi.Live), Effect.provide(context));
    const mailbox = new CanaryMailbox(api, (path, init) =>
      makeGoogleApiRequest(`${API}${path}`, init).pipe(Effect.provide(context)),
    );
    const { emailAddress } = yield* retrying(api.getProfile('me'));
    if (emailAddress?.toLowerCase() !== CANARY_ACCOUNT) {
      return yield* new CanaryError({ message: `the grant belongs to ${emailAddress}, not ${CANARY_ACCOUNT}` });
    }
    return mailbox;
  });

  readonly #api: GoogleMailApiService;
  readonly #request: Request;

  constructor(api: GoogleMailApiService, request: Request) {
    this.#api = api;
    this.#request = request;
  }

  /** Every message id matching a Gmail search, newest first. */
  listIds(query: string): Effect.Effect<string[], MailboxError> {
    return Effect.gen({ self: this }, function* () {
      const ids: string[] = [];
      let pageToken: string | undefined;
      do {
        const page = yield* retrying(this.#api.listMessages('me', query, 500, pageToken));
        ids.push(...(page.messages ?? []).map((message) => message.id));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return ids;
    });
  }

  getRaw(id: string): Effect.Effect<string, MailboxError> {
    return this.#call(Raw, `/messages/${id}?format=raw`).pipe(Effect.map(({ raw }) => decode(raw)));
  }

  /** The named headers, keyed by the names asked for: header names are case-insensitive. */
  getHeaders(id: string, names: readonly string[]) {
    return retrying(this.#api.getMessage('me', id)).pipe(
      Effect.map((message) => ({
        internalDate: Number(message.internalDate),
        headers: Object.fromEntries(
          names.flatMap((name) => {
            const header = message.payload.headers.find((header) => header.name.toLowerCase() === name.toLowerCase());
            return header ? [[name, header.value]] : [];
          }),
        ),
      })),
    );
  }

  /** Puts a message in the mailbox as if delivered now, without sending it. */
  insert(message: string, labelIds: readonly string[]): Effect.Effect<string, MailboxError> {
    return this.#write('/messages?internalDateSource=receivedTime', message, labelIds);
  }

  /** Imports a message as received mail dated by its own `Date` header, never as spam. */
  import(message: string, labelIds: readonly string[]): Effect.Effect<string, MailboxError> {
    return this.#write('/messages/import?internalDateSource=dateHeader&neverMarkSpam=true', message, labelIds);
  }

  trash(id: string): Effect.Effect<void, MailboxError> {
    return retrying(this.#api.trashMessage('me', id)).pipe(Effect.asVoid);
  }

  /** The id of a user label, created when it does not exist yet. */
  ensureLabel(name: string): Effect.Effect<string, MailboxError> {
    return Effect.gen({ self: this }, function* () {
      const { labels } = yield* retrying(this.#api.listLabels('me'));
      const existing = labels.find((label) => label.name === name);
      return existing?.id ?? (yield* this.#call(Ref, '/labels', { method: 'POST', body: JSON.stringify({ name }) })).id;
    });
  }

  #write(path: string, message: string, labelIds: readonly string[]) {
    const body = JSON.stringify({ raw: encode(message), labelIds });
    return this.#call(Ref, path, { method: 'POST', body }).pipe(Effect.map(({ id }) => id));
  }

  #call<S extends Schema.Top>(schema: S, path: string, init?: { method?: string; body?: string }) {
    return retrying(this.#request(path, init)).pipe(
      Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body)),
      Effect.mapError((error) =>
        Schema.isSchemaError(error)
          ? new CanaryError({ message: `unexpected Gmail response: ${error.message}` })
          : error,
      ),
    );
  }
}

// `makeGoogleApiRequest` retries only transport failures; Gmail's quota 429s and odd 5xx clear on their own.
const retrying = <A>(effect: Effect.Effect<A, GoogleMailApiError>) =>
  effect.pipe(
    Effect.retry({
      while: (error) => error instanceof GoogleApiError && (error.code === 429 || (error.code ?? 0) >= 500),
      schedule: Schedule.exponential('1 second'),
      times: 6,
    }),
  );

type Requirements = HttpClient.HttpClient | GoogleCredentials | Credential.CredentialsService;

/** What plugin-google's Gmail calls need, authenticated with one access token rather than a space's connection. */
const requirements = (token: string): Layer.Layer<Requirements> =>
  Layer.mergeAll(
    GoogleCredentials.default,
    configuredCredentialsLayer([{ service: GOOGLE_INTEGRATION_SOURCE, apiKey: token }]),
    FetchHttpClient.layer,
  );

/** Mints an access token; a dead grant fails with Google's `invalid_grant`, which the nightly reports as AUTH. */
const accessToken = ({ clientId, clientSecret, refreshToken }: GmailCredentials) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${response.status}: ${text.slice(0, 300)}`);
      }
      return Schema.decodeUnknownSync(Schema.Struct({ access_token: Schema.String }))(JSON.parse(text)).access_token;
    },
    catch: (cause) => new CanaryError({ message: `cannot mint a Gmail access token: ${String(cause)}` }),
  });

// Latin-1 round-trips every byte, so an 8-bit body survives decode and re-encode unchanged.
const encode = (message: string): string => Buffer.from(message, 'latin1').toString('base64url');
const decode = (raw: string): string => Buffer.from(raw, 'base64url').toString('latin1');

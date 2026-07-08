//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Credential } from '@dxos/compute';

import { GoogleMail } from '../apis';
import { GoogleCredentials } from './google-credentials';

/**
 * The requirements the underlying {@link GoogleMail} request functions carry (auth token + HTTP
 * client). {@link GoogleMailApi.Live} bakes these in so the service methods themselves require
 * nothing — which is what lets a test satisfy {@link GoogleMailApi} with a zero-dependency mock (no
 * HTTP, no credentials).
 */
type Requirements = HttpClient.HttpClient | GoogleCredentials | Credential.CredentialsService;

/** Strips a {@link GoogleMail} request function's requirements (baked in by {@link GoogleMailApi.Live}). */
type Baked<Fn> = Fn extends (...args: infer A) => Effect.Effect<infer S, infer E, any>
  ? (...args: A) => Effect.Effect<S, E>
  : never;

/**
 * Swappable Gmail API surface. `Live` delegates to the real {@link GoogleMail} request functions;
 * tests provide a data-backed mock. Making the Gmail dependency a service (rather than the sync
 * operation calling `GoogleMail.*` and hardcoding `FetchHttpClient.layer` internally) is what lets
 * the sync run against generated data with no live account.
 */
export interface GoogleMailApiService {
  readonly listLabels: Baked<typeof GoogleMail.listLabels>;
  readonly listMessages: Baked<typeof GoogleMail.listMessages>;
  readonly getMessage: Baked<typeof GoogleMail.getMessage>;
  readonly sendMessage: Baked<typeof GoogleMail.sendMessage>;
  readonly trashMessage: Baked<typeof GoogleMail.trashMessage>;
}

/**
 * An in-memory Gmail dataset a {@link GoogleMailApi.mock} serves — the labels and the full messages
 * the sync would fetch. Build one with `generateGmailDataset` from `@dxos/plugin-inbox/testing`.
 */
export interface GmailDataset {
  readonly labels: readonly GoogleMail.Label[];
  /** Full messages, ordered ascending by `internalDate` (the mock paginates a date window over them). */
  readonly messages: readonly GoogleMail.Message[];
}

/** Parses Gmail's `after:YYYY/MM/DD` / `before:YYYY/MM/DD` window (epoch-ms) from a list query. */
const parseDateWindow = (query: string): { after?: number; before?: number } => {
  const toMs = (value: string | undefined) => (value ? new Date(value.replace(/\//g, '-')).getTime() : undefined);
  return {
    after: toMs(query.match(/after:(\d{4}\/\d{2}\/\d{2})/)?.[1]),
    before: toMs(query.match(/before:(\d{4}\/\d{2}\/\d{2})/)?.[1]),
  };
};

export class GoogleMailApi extends Context.Tag('@dxos/plugin-inbox/GoogleMailApi')<
  GoogleMailApi,
  GoogleMailApiService
>() {
  /**
   * Live layer backed by the real Gmail HTTP client. Captures the auth/HTTP context once and provides
   * it to each request, so the resulting service methods carry no requirements. Requires an
   * `HttpClient`, a `GoogleCredentials` (e.g. {@link GoogleCredentials.fromConnection}), and a
   * `CredentialsService` (the fallback path) to be available where it is provided.
   */
  static readonly Live: Layer.Layer<GoogleMailApi, never, Requirements> = Layer.effect(
    GoogleMailApi,
    Effect.gen(function* () {
      const context = yield* Effect.context<Requirements>();
      return GoogleMailApi.of({
        listLabels: (userId) => Effect.provide(GoogleMail.listLabels(userId), context),
        listMessages: (userId, q, pageSize, pageToken) =>
          Effect.provide(GoogleMail.listMessages(userId, q, pageSize, pageToken), context),
        getMessage: (userId, messageId) => Effect.provide(GoogleMail.getMessage(userId, messageId), context),
        sendMessage: (userId, message) => Effect.provide(GoogleMail.sendMessage(userId, message), context),
        trashMessage: (userId, messageId) => Effect.provide(GoogleMail.trashMessage(userId, messageId), context),
      });
    }),
  );

  /**
   * Zero-dependency mock backed by an in-memory {@link GmailDataset} — for unit/benchmark tests that
   * drive the real sync pipeline with no live account. `listMessages` honours the query's date window
   * (`after:`/`before:`) plus `pageSize`/`pageToken` (an integer offset), so the sync's date-walk and
   * pagination exercise realistically.
   */
  static readonly mock = (dataset: GmailDataset): Layer.Layer<GoogleMailApi> => {
    const byId = new Map(dataset.messages.map((message) => [message.id, message]));
    return Layer.succeed(
      GoogleMailApi,
      GoogleMailApi.of({
        listLabels: () => Effect.succeed({ labels: dataset.labels }),
        listMessages: (_userId, query, pageSize, pageToken) =>
          Effect.sync(() => {
            const { after, before } = parseDateWindow(query);
            const matching = dataset.messages.filter((message) => {
              const at = Number(message.internalDate);
              return (after === undefined || at >= after) && (before === undefined || at < before);
            });
            const offset = pageToken ? Number.parseInt(pageToken, 10) : 0;
            const page = matching.slice(offset, offset + pageSize);
            const nextOffset = offset + page.length;
            return {
              resultSizeEstimate: matching.length,
              messages: page.map((message) => ({ id: message.id, threadId: message.threadId })),
              nextPageToken: nextOffset < matching.length ? String(nextOffset) : undefined,
            };
          }),
        getMessage: (_userId, messageId) => {
          const message = byId.get(messageId);
          return message
            ? Effect.succeed(message)
            : Effect.die(new Error(`mock GoogleMailApi: message not in dataset: ${messageId}`));
        },
        sendMessage: () => Effect.die(new Error('mock GoogleMailApi: sendMessage not supported')),
        trashMessage: () => Effect.die(new Error('mock GoogleMailApi: trashMessage not supported')),
      }),
    );
  };
}

//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as HttpClientError from '@effect/platform/HttpClientError';
import type * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as ParseResult from 'effect/ParseResult';

import { Credential } from '@dxos/compute';

import { GoogleMail } from '../apis';
import { GoogleApiError } from '../errors';
import { GoogleCredentials } from './google-credentials';

/**
 * The requirements the underlying {@link GoogleMail} request functions carry (auth token + HTTP
 * client). {@link GoogleMailApi.Live} bakes these in so the service methods themselves require
 * nothing — which is what lets a test satisfy {@link GoogleMailApi} with a zero-dependency mock (no
 * HTTP, no credentials).
 */
type Requirements = HttpClient.HttpClient | GoogleCredentials | Credential.CredentialsService;

/**
 * The failure modes shared by every {@link GoogleMail} request: transport ({@link GoogleApiError},
 * HTTP, request timeout) and decode ({@link GoogleMail.GoogleError}, schema parse).
 */
export type GoogleMailApiError =
  | GoogleApiError
  | HttpClientError.HttpClientError
  | Cause.TimeoutException
  | GoogleMail.GoogleError
  | ParseResult.ParseError;

/**
 * Swappable Gmail API surface. `Live` delegates to the real {@link GoogleMail} request functions;
 * tests provide a data-backed mock. Making the Gmail dependency a service (rather than the sync
 * operation calling `GoogleMail.*` and hardcoding `FetchHttpClient.layer` internally) is what lets
 * the sync run against generated data with no live account. Methods carry no requirements: `Live`
 * bakes them in (see {@link Requirements}) so a mock can satisfy the surface with no HTTP or creds.
 */
export interface GoogleMailApiService {
  readonly listLabels: (userId: string) => Effect.Effect<GoogleMail.LabelsResponse, GoogleMailApiError>;
  readonly listMessages: (
    userId: string,
    q: string,
    pageSize: number,
    pageToken?: string,
  ) => Effect.Effect<GoogleMail.ListMessagesResponse, GoogleMailApiError>;
  readonly getMessage: (userId: string, messageId: string) => Effect.Effect<GoogleMail.Message, GoogleMailApiError>;
  readonly getProfile: (userId: string) => Effect.Effect<GoogleMail.Profile, GoogleMailApiError>;
  readonly listHistory: (
    userId: string,
    options: { startHistoryId: string; labelId?: string; pageToken?: string; maxResults?: number },
  ) => Effect.Effect<GoogleMail.HistoryResponse, GoogleMailApiError>;
  readonly getAttachment: (
    userId: string,
    messageId: string,
    attachmentId: string,
  ) => Effect.Effect<GoogleMail.MessagePartBody, GoogleMailApiError>;
  readonly sendMessage: (
    userId: string,
    message: { raw: string; threadId?: string },
  ) => Effect.Effect<
    { readonly id: string; readonly threadId: string; readonly labelIds: readonly string[] },
    GoogleMailApiError
  >;
  readonly trashMessage: (userId: string, messageId: string) => Effect.Effect<GoogleMail.Message, GoogleMailApiError>;
}

/**
 * An in-memory Gmail dataset a {@link GoogleMailApi.mock} serves — the labels and the full messages
 * the sync would fetch. Build one with `generateGmailDataset` from `@dxos/plugin-inbox/testing`.
 */
export interface GmailDataset {
  readonly labels: readonly GoogleMail.Label[];
  /** Full messages, ordered ascending by `internalDate` (the mock paginates a date window over them). */
  readonly messages: readonly GoogleMail.Message[];
  /** Attachment bytes keyed by `attachmentId`, served by `getAttachment` for messages that carry one. */
  readonly attachments?: Readonly<Record<string, GoogleMail.MessagePartBody>>;
  /**
   * Current mailbox `historyId` — `getProfile` returns it and it's the newest `history.list` position.
   * Set to exercise incremental sync; absent means "no delta support" (token capture returns none).
   */
  readonly historyId?: string;
  /** Ordered `history.list` steps chaining `startHistoryId` → `historyId`, each carrying the delta. */
  readonly historyLog?: readonly GmailHistoryStep[];
}

/** One `history.list` step in a {@link GmailDataset}'s history log. */
export interface GmailHistoryStep {
  readonly startHistoryId: string;
  readonly historyId: string;
  /** Ids of messages added in this step. */
  readonly messagesAdded?: readonly string[];
  /** Per-message label additions in this step. */
  readonly labelsAdded?: readonly { readonly id: string; readonly labelIds: readonly string[] }[];
  /** Per-message label removals in this step. */
  readonly labelsRemoved?: readonly { readonly id: string; readonly labelIds: readonly string[] }[];
  /** Ids of messages deleted in this step. */
  readonly messagesDeleted?: readonly string[];
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
        getProfile: (userId) => Effect.provide(GoogleMail.getProfile(userId), context),
        listHistory: (userId, options) => Effect.provide(GoogleMail.listHistory(userId, options), context),
        getAttachment: (userId, messageId, attachmentId) =>
          Effect.provide(GoogleMail.getAttachment(userId, messageId, attachmentId), context),
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
            // Real Gmail returns matches newest-first (undocumented but consistently-observed
            // behavior) — sort descending rather than relying on `dataset.messages`'s own (ascending,
            // fixture-construction) order, so the mock exercises `fetchMessagesForDateRange`'s
            // direction-conditional within-chunk ordering realistically.
            const matching = dataset.messages
              .filter((message) => {
                const at = Number(message.internalDate);
                return (after === undefined || at >= after) && (before === undefined || at < before);
              })
              .sort((left, right) => Number(right.internalDate) - Number(left.internalDate));
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
        getProfile: () => Effect.succeed({ historyId: dataset.historyId }),
        // Chains the history-log steps from `startHistoryId` into one record per step (Gmail returns a
        // record per change-batch), then paginates them by `historyPageSize`. `historyId` is the
        // mailbox's *current* record on every page (Gmail semantics), so a caller that stops at page one
        // advances past the unread pages. An unknown/evicted id (no chain match, not already the latest)
        // fails with a 404 GoogleApiError, matching a server past its retention window.
        listHistory: (_userId, options) =>
          Effect.gen(function* () {
            const latest = dataset.historyId;
            const records: {
              id: string;
              messagesAdded: { message: { id: string } }[];
              labelsAdded: { message: { id: string }; labelIds: readonly string[] }[];
              labelsRemoved: { message: { id: string }; labelIds: readonly string[] }[];
            }[] = [];
            let chain = options.startHistoryId;
            let matched = latest !== undefined && options.startHistoryId === latest;
            for (const step of dataset.historyLog ?? []) {
              if (step.startHistoryId === chain) {
                matched = true;
                records.push({
                  id: step.historyId,
                  messagesAdded: (step.messagesAdded ?? []).map((id) => ({ message: { id } })),
                  labelsAdded: (step.labelsAdded ?? []).map((entry) => ({
                    message: { id: entry.id },
                    labelIds: entry.labelIds,
                  })),
                  labelsRemoved: (step.labelsRemoved ?? []).map((entry) => ({
                    message: { id: entry.id },
                    labelIds: entry.labelIds,
                  })),
                });
                chain = step.historyId;
              }
            }
            if (!matched) {
              return yield* Effect.fail(new GoogleApiError(404, 'Requested entity was not found.'));
            }
            // One bounded page per call (honors `maxResults`). The caller resumes across runs from the
            // last record's id (not `pageToken`), so more records simply mean a non-empty `nextPageToken`.
            const pageSize = options.maxResults ?? (records.length || 1);
            const page = records.slice(0, pageSize);
            return {
              history: page,
              historyId: latest ?? options.startHistoryId,
              nextPageToken: page.length < records.length ? 'more' : undefined,
            };
          }),
        getAttachment: (_userId, _messageId, attachmentId) => {
          const body = dataset.attachments?.[attachmentId];
          return body
            ? Effect.succeed(body)
            : Effect.die(new Error(`mock GoogleMailApi: attachment not in dataset: ${attachmentId}`));
        },
        sendMessage: () => Effect.die(new Error('mock GoogleMailApi: sendMessage not supported')),
        trashMessage: () => Effect.die(new Error('mock GoogleMailApi: trashMessage not supported')),
      }),
    );
  };
}

//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import { Jmap, JmapMail } from '../apis';
import { type JmapApiError } from '../errors';
import { type JmapCredentials } from './jmap-credentials';

/**
 * The requirements the underlying {@link Jmap}/{@link JmapMail} request functions carry (HTTP client
 * + JMAP credentials). {@link JmapMailApi.Live} bakes these in so the service methods themselves
 * require nothing — which is what lets a test satisfy {@link JmapMailApi} with a zero-dependency mock
 * (no HTTP, no credentials, no live server).
 */
type Requirements = HttpClient.HttpClient | JmapCredentials;

/**
 * Swappable JMAP API surface. `Live` delegates to the real {@link Jmap}/{@link JmapMail} request
 * functions; tests provide a data-backed mock. Making the JMAP dependency a service (rather than the
 * sync operation calling `Jmap.*`/`JmapMail.*` and hardcoding `FetchHttpClient.layer` internally) is
 * what lets the sync run against generated data with no live account — mirrors `GoogleMailApi`.
 * Every request fails only with {@link JmapApiError}, and methods carry no requirements: `Live`
 * bakes them in (see {@link Requirements}) so a mock can satisfy the surface with no HTTP or creds.
 */
export interface JmapMailApiService {
  readonly getSession: Effect.Effect<Jmap.Session, JmapApiError>;
  readonly mailboxGet: (target: JmapMail.Target) => Effect.Effect<JmapMail.MailboxGetResult, JmapApiError>;
  readonly emailQuery: (
    target: JmapMail.Target,
    options?: {
      filter?: unknown;
      sort?: readonly { property: string; isAscending?: boolean }[];
      position?: number;
      limit?: number;
      calculateTotal?: boolean;
    },
  ) => Effect.Effect<JmapMail.EmailQueryResult, JmapApiError>;
  readonly emailGet: (
    target: JmapMail.Target,
    ids: readonly string[],
    properties?: readonly string[],
  ) => Effect.Effect<JmapMail.EmailGetResult, JmapApiError>;
  readonly downloadBlob: (
    target: JmapMail.Target,
    blobId: string,
    options?: { name?: string; type?: string },
  ) => Effect.Effect<Uint8Array, JmapApiError>;
  readonly identityGet: (target: JmapMail.Target) => Effect.Effect<JmapMail.IdentityGetResult, JmapApiError>;
  readonly emailSetUpdate: (
    target: JmapMail.Target,
    emailId: string,
    patch: Record<string, unknown>,
  ) => Effect.Effect<JmapMail.EmailSetResult, JmapApiError>;
  readonly submitEmail: (
    target: JmapMail.Target,
    args: {
      identityId: string;
      draftsMailboxId: string;
      sentMailboxId: string;
      draft: {
        from: readonly JmapMail.EmailAddress[];
        to: readonly JmapMail.EmailAddress[];
        cc?: readonly JmapMail.EmailAddress[];
        bcc?: readonly JmapMail.EmailAddress[];
        subject?: string;
        inReplyTo?: readonly string[];
        references?: readonly string[];
        text: string;
      };
    },
  ) => Effect.Effect<{ id: string; threadId: string | undefined }, JmapApiError>;
}

/**
 * An in-memory JMAP dataset a {@link JmapMailApi.mock} serves — the session (account discovery), the
 * folders (mailboxes), and the full emails the sync would fetch. Build one with `generateJmapDataset`
 * from `@dxos/plugin-inbox/testing`.
 */
export interface JmapDataset {
  readonly session: Jmap.Session;
  readonly folders: readonly JmapMail.Mailbox[];
  /** Full emails, ordered ascending by `receivedAt` (the mock sorts/paginates a window over them). */
  readonly emails: readonly JmapMail.Email[];
  /** Attachment bytes keyed by `blobId`, served by `downloadBlob` for emails that carry one. */
  readonly blobs?: Readonly<Record<string, Uint8Array>>;
}

/** Narrows an `unknown` filter value to a plain object so the mock can walk its conditions. */
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Evaluates an `Email/query` filter against an email — enough of RFC 8621 §4.4.1 for the sync's
 * generated filter: the `after`/`before` window, `inMailbox`/`inMailboxOtherThan` folder scope, and
 * the AND/OR/NOT operator combinators. Unknown conditions are treated as matching.
 */
const matchesFilter = (email: JmapMail.Email, filter: unknown): boolean => {
  if (!isRecord(filter)) {
    return true;
  }
  if ('operator' in filter && Array.isArray(filter.conditions)) {
    const results = filter.conditions.map((condition) => matchesFilter(email, condition));
    if (filter.operator === 'OR') {
      return results.some(Boolean);
    }
    if (filter.operator === 'NOT') {
      return !results.some(Boolean);
    }
    return results.every(Boolean); // AND (the default the sync builds).
  }

  const receivedAt = new Date(email.receivedAt).getTime();
  // `after` is inclusive (>=), `before` is exclusive (<) — matches the sync's window semantics.
  if (typeof filter.after === 'string' && receivedAt < new Date(filter.after).getTime()) {
    return false;
  }
  if (typeof filter.before === 'string' && receivedAt >= new Date(filter.before).getTime()) {
    return false;
  }
  const mailboxIds = email.mailboxIds ? Object.keys(email.mailboxIds) : [];
  if (typeof filter.inMailbox === 'string' && !mailboxIds.includes(filter.inMailbox)) {
    return false;
  }
  if (Array.isArray(filter.inMailboxOtherThan)) {
    const excluded = filter.inMailboxOtherThan;
    if (!mailboxIds.some((id) => !excluded.includes(id))) {
      return false;
    }
  }
  return true;
};

/** Sorts emails by the query's primary sort (only `receivedAt` is used by the sync). */
const sortEmails = (
  emails: readonly JmapMail.Email[],
  sort: readonly { property: string; isAscending?: boolean }[] | undefined,
): readonly JmapMail.Email[] => {
  const primary = sort?.[0];
  if (!primary || primary.property !== 'receivedAt') {
    return emails;
  }
  const direction = primary.isAscending ? 1 : -1;
  return [...emails].sort(
    (left, right) => direction * (new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime()),
  );
};

export class JmapMailApi extends Context.Tag('@dxos/plugin-inbox/JmapMailApi')<JmapMailApi, JmapMailApiService>() {
  /**
   * Live layer backed by the real JMAP HTTP client. Captures the auth/HTTP context once and provides
   * it to each request, so the resulting service methods carry no requirements. Requires an
   * `HttpClient` and a `JmapCredentials` (e.g. {@link JmapCredentials.fromConnection}) to be available
   * where it is provided.
   */
  static readonly Live: Layer.Layer<JmapMailApi, never, Requirements> = Layer.effect(
    JmapMailApi,
    Effect.gen(function* () {
      const context = yield* Effect.context<Requirements>();
      return JmapMailApi.of({
        getSession: Effect.provide(Jmap.getSession, context),
        mailboxGet: (target) => Effect.provide(JmapMail.mailboxGet(target), context),
        emailQuery: (target, options) => Effect.provide(JmapMail.emailQuery(target, options), context),
        emailGet: (target, ids, properties) => Effect.provide(JmapMail.emailGet(target, ids, properties), context),
        downloadBlob: (target, blobId, options) =>
          Effect.provide(JmapMail.downloadBlob(target, blobId, options), context),
        identityGet: (target) => Effect.provide(JmapMail.identityGet(target), context),
        emailSetUpdate: (target, emailId, patch) =>
          Effect.provide(JmapMail.emailSetUpdate(target, emailId, patch), context),
        submitEmail: (target, args) => Effect.provide(JmapMail.submitEmail(target, args), context),
      });
    }),
  );

  /**
   * Zero-dependency mock backed by an in-memory {@link JmapDataset} — for unit tests that drive the
   * real sync pipeline with no live account. `emailQuery` honours the query filter (`after`/`before`
   * window + folder scope), the `receivedAt` sort, and `position`/`limit` pagination, so the sync's
   * window walk and pagination exercise realistically. Write methods are unsupported (die).
   */
  static readonly mock = (dataset: JmapDataset): Layer.Layer<JmapMailApi> => {
    const byId = new Map(dataset.emails.map((email) => [email.id, email]));
    return Layer.succeed(
      JmapMailApi,
      JmapMailApi.of({
        getSession: Effect.succeed(dataset.session),
        mailboxGet: () => Effect.succeed({ list: dataset.folders }),
        emailQuery: (_target, options = {}) =>
          Effect.sync(() => {
            const matching = sortEmails(
              dataset.emails.filter((email) => matchesFilter(email, options.filter)),
              options.sort,
            );
            const position = options.position ?? 0;
            const limit = options.limit ?? matching.length;
            const page = matching.slice(position, position + limit);
            return { position, total: matching.length, ids: page.map((email) => email.id) };
          }),
        emailGet: (_target, ids) =>
          Effect.sync(() => ({ list: ids.map((id) => byId.get(id)).filter(Predicate.isNotNullable) })),
        downloadBlob: (_target, blobId) => {
          const bytes = dataset.blobs?.[blobId];
          return bytes
            ? Effect.succeed(bytes)
            : Effect.die(new Error(`mock JmapMailApi: blob not in dataset: ${blobId}`));
        },
        identityGet: () => Effect.die(new Error('mock JmapMailApi: identityGet not supported')),
        emailSetUpdate: () => Effect.die(new Error('mock JmapMailApi: emailSetUpdate not supported')),
        submitEmail: () => Effect.die(new Error('mock JmapMailApi: submitEmail not supported')),
      }),
    );
  };
}

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

import { type RatingOverrides } from '../model/rating.ts';
import { type ResultsView, cleanView } from '../model/view.ts';
import {
  toExplainNode,
  toIssue,
  toIssues,
  toNodeFacts,
  toPlugins,
  toPredicates,
  toSubjectGraph,
} from './decode-meta.ts';
import { asRecord, asString, toEngines, toEntities, toEntity, toExtensions, toSession, toUpdate } from './decode.ts';
import { createSseParser } from './sse.ts';
import {
  type Budget,
  type Engine,
  type Entity,
  type ExplainNode,
  type Extension,
  type InputImage,
  type Issue,
  type IssueStatus,
  type NodeFacts,
  type Plugin,
  type Predicate,
  type Session,
  type SessionUpdate,
  type Status,
  type StorageReport,
  type SubjectGraph,
  type Vote,
} from './types.ts';

/** A lighthouse request failed: transport, an HTTP status, or the API's `{ error: { code, message, hint } }`. */
export class LighthouseError extends BaseError.extend('LighthouseError', 'Lighthouse request failed.') {
  constructor(
    readonly status: number | undefined,
    readonly code: string | undefined,
    options?: BaseErrorOptions,
  ) {
    super({ ...options, context: { ...(options?.context ?? {}), status, code } });
  }
}

/** The client name lighthouse shows beside a message or vote in the thread. */
export const CLIENT_NAME = 'composer';

/** Where a lighthouse server is and how to authenticate to it. */
export type LighthouseEndpoint = {
  /** The server's base URL (`http://127.0.0.1:4319`); routes are under `/v1`. */
  url: string;
  /** The workspace's API token, sent as a bearer credential; empty when the server needs none. */
  token?: string;
};

/**
 * The lighthouse API as the plugin uses it. Every request is an Effect failing with {@link LighthouseError};
 * {@link LighthouseClient.streamSession} runs until interrupted, reconnecting from the last event it saw.
 */
export interface LighthouseClient {
  readonly endpoint: LighthouseEndpoint;
  status(): Effect.Effect<Status, LighthouseError>;
  listEngines(): Effect.Effect<Engine[], LighthouseError>;
  listExtensions(): Effect.Effect<Extension[], LighthouseError>;
  createSession(input: {
    goal: string;
    budget?: Budget;
    images?: readonly InputImage[];
  }): Effect.Effect<{ run: string }, LighthouseError>;
  getSession(run: string): Effect.Effect<Session, LighthouseError>;
  /** Every session, archived ones included (a deep extension's research sessions are archived when they report). */
  listSessions(): Effect.Effect<Session[], LighthouseError>;
  /** A session's results (`GET /sessions/:run/results`), unranked, up to `limit`. */
  listResults(run: string, options?: { limit?: number }): Effect.Effect<Entity[], LighthouseError>;
  sendMessage(
    run: string,
    text: string,
    options?: { model?: string; images?: readonly InputImage[] },
  ): Effect.Effect<void, LighthouseError>;
  /** A blob of the run (an input image, a feature crop) by its `sha256:` hash. */
  getBlob(run: string, hash: string): Effect.Effect<Blob, LighthouseError>;
  stopSession(run: string): Effect.Effect<void, LighthouseError>;
  sendFeedback(run: string, id: string, vote: Vote): Effect.Effect<void, LighthouseError>;
  setOverrides(run: string, overrides: RatingOverrides): Effect.Effect<void, LighthouseError>;
  /** The person's filters and sort (`GET /sessions/:run/view`); empty when the daemon predates the route. */
  getView(run: string): Effect.Effect<ResultsView, LighthouseError>;
  /** Saves the person's filters and sort (`PUT /sessions/:run/view`); the saved view as the daemon cleaned it. */
  setView(run: string, view: ResultsView): Effect.Effect<ResultsView, LighthouseError>;
  extend(
    run: string,
    input: { subject: string; extension: string; deep?: boolean },
  ): Effect.Effect<{ child?: string }, LighthouseError>;
  /** One subject's current facts with provenance. */
  getEntity(iri: string): Effect.Effect<Entity | undefined, LighthouseError>;
  streamSession(run: string, onUpdate: (update: SessionUpdate) => void): Effect.Effect<never>;
  /** The roots' neighbourhood in the graph (`GET /v1/graph?iri=a,b&depth=&limit=`). */
  getGraph(
    iris: readonly string[],
    options?: { depth?: number; limit?: number },
  ): Effect.Effect<SubjectGraph, LighthouseError>;
  /** One node's facts with provenance (`GET /v1/graph/node?iri=`). */
  getGraphNode(iri: string): Effect.Effect<NodeFacts, LighthouseError>;
  /** The session's trajectory as a tree (`GET /v1/sessions/:run/explain`). */
  explain(run: string): Effect.Effect<ExplainNode, LighthouseError>;
  listPlugins(): Effect.Effect<Plugin[], LighthouseError>;
  listPredicates(): Effect.Effect<Predicate[], LighthouseError>;
  listIssues(): Effect.Effect<Issue[], LighthouseError>;
  commentIssue(id: string, text: string): Effect.Effect<Issue | undefined, LighthouseError>;
  setIssueStatus(id: string, status: IssueStatus, note?: string): Effect.Effect<Issue | undefined, LighthouseError>;
  getStorage(): Effect.Effect<StorageReport, LighthouseError>;
  clearCache(namespace?: string): Effect.Effect<StorageReport, LighthouseError>;
  pruneSnapshots(options: { olderThanDays?: number; dryRun?: boolean }): Effect.Effect<StorageReport, LighthouseError>;
}

const RECONNECT_DELAY = '2 seconds';

const trimSlash = (url: string) => url.replace(/\/+$/, '');

/** Reads lighthouse's error body (`{ error: { code, message, hint } }`), the CLI's error shape. */
const toError = (status: number, body: unknown) => {
  const error = asRecord(asRecord(body)?.error);
  const message = [asString(error?.message) ?? `HTTP ${status}`, asString(error?.hint)].filter(Boolean).join(' - ');
  return new LighthouseError(status, asString(error?.code), { message });
};

/** The HTTP client for one endpoint (lighthouse-api /v1). */
export const makeClient = (endpoint: LighthouseEndpoint): LighthouseClient => {
  const base = trimSlash(endpoint.url).replace(/\/v1$/, '');
  const root = `${base}/v1`;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(endpoint.token ? { authorization: `Bearer ${endpoint.token}` } : {}),
  };

  const request = (method: string, path: string, body?: unknown): Effect.Effect<unknown, LighthouseError> =>
    Effect.tryPromise({
      try: async (signal) => {
        const response = await fetch(`${root}${path}`, {
          method,
          headers,
          signal,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        const text = await response.text();
        const json: unknown = text ? JSON.parse(text) : undefined;
        return { response, json };
      },
      catch: (cause) =>
        new LighthouseError(undefined, 'unreachable', {
          message: `Lighthouse at ${base} did not answer.`,
          cause,
        }),
    }).pipe(
      Effect.flatMap(({ response, json }) =>
        response.ok ? Effect.succeed(json) : Effect.fail(toError(response.status, json)),
      ),
    );

  const get = (path: string) => request('GET', path);
  const post = (path: string, body: unknown = {}) => request('POST', path, body);
  const session = (run: string) => `/sessions/${encodeURIComponent(run)}`;

  /** One stream connection: resolves when the server closes it, fails when it cannot connect. */
  const streamOnce = (run: string, after: string | undefined, onMessage: (event: string, data: unknown) => void) =>
    Effect.tryPromise({
      try: async (signal) => {
        const response = await fetch(`${root}${session(run)}/stream`, {
          headers: { ...headers, accept: 'text/event-stream', ...(after ? { 'last-event-id': after } : {}) },
          signal,
        });
        if (!response.ok || !response.body) {
          throw toError(response.status, undefined);
        }
        const parser = createSseParser(({ event, data }) => {
          try {
            onMessage(event, JSON.parse(data));
          } catch {
            // A malformed frame is skipped; the next snapshot or event carries the state forward.
          }
        });
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              return parser.lastEventId;
            }
            parser.push(value);
          }
        } finally {
          reader.releaseLock();
        }
      },
      catch: (cause) =>
        cause instanceof LighthouseError
          ? cause
          : new LighthouseError(undefined, 'stream_lost', { message: 'The session stream closed.', cause }),
    });

  const streamSession = (run: string, onUpdate: (update: SessionUpdate) => void): Effect.Effect<never> =>
    Effect.gen(function* () {
      let after: string | undefined;
      for (;;) {
        const lastId = yield* streamOnce(run, after, (event, data) => {
          if (event !== 'heartbeat') {
            onUpdate({ type: 'connection', connected: true });
          }
          const update = toUpdate(event, data);
          if (update) {
            onUpdate(update);
          }
        }).pipe(Effect.orElseSucceed(() => undefined));
        // Event ids are trajectory seqs: a reconnect resumes after the last one seen.
        after = lastId ?? after;
        onUpdate({ type: 'connection', connected: false });
        yield* Effect.sleep(RECONNECT_DELAY);
      }
    });

  return {
    endpoint,
    status: () =>
      get('/status').pipe(
        Effect.map((json) => ({
          version: asString(asRecord(json)?.api),
          workspace: asString(asRecord(json)?.workspace),
        })),
      ),
    listEngines: () => get('/engines').pipe(Effect.map(toEngines)),
    listExtensions: () => get('/extensions').pipe(Effect.map(toExtensions)),
    createSession: ({ goal, budget, images }) =>
      post('/sessions', {
        goal,
        ...(budget ? { budget } : {}),
        ...(images?.length ? { images } : {}),
        from: CLIENT_NAME,
      }).pipe(
        Effect.flatMap((json) => {
          const run = asString(asRecord(json)?.run);
          return run
            ? Effect.succeed({ run })
            : Effect.fail(new LighthouseError(undefined, 'bad_response', { message: 'No run in the response.' }));
        }),
      ),
    getSession: (run) =>
      get(session(run)).pipe(
        Effect.flatMap((json) => {
          const parsed = toSession(json);
          return parsed
            ? Effect.succeed(parsed)
            : Effect.fail(new LighthouseError(undefined, 'bad_response', { message: `No session ${run}.` }));
        }),
      ),
    listSessions: () =>
      Effect.all([get('/sessions?archived=0'), get('/sessions?archived=1')]).pipe(
        Effect.map(([live, archived]) =>
          [...(Array.isArray(live) ? live : []), ...(Array.isArray(archived) ? archived : [])].flatMap(
            (item) => toSession(item) ?? [],
          ),
        ),
      ),
    listResults: (run, options) =>
      get(`${session(run)}/results?limit=${options?.limit ?? 500}`).pipe(Effect.map(toEntities)),
    sendMessage: (run, text, options) =>
      post(`${session(run)}/messages`, {
        text,
        ...(options?.model ? { model: options.model } : {}),
        ...(options?.images?.length ? { images: options.images } : {}),
        from: CLIENT_NAME,
      }).pipe(Effect.asVoid),
    getBlob: (run, hash) =>
      Effect.tryPromise({
        try: async (signal) => {
          const response = await fetch(
            `${root}${session(run)}/blobs/${encodeURIComponent(hash.replace(/^sha256:/, ''))}`,
            {
              headers: endpoint.token ? { authorization: `Bearer ${endpoint.token}` } : {},
              signal,
            },
          );
          if (!response.ok) {
            throw new Error(`blob ${hash}: ${response.status}`);
          }
          return response.blob();
        },
        catch: (cause) => new LighthouseError(undefined, 'blob', { message: `No blob ${hash}.`, cause }),
      }),
    stopSession: (run) => post(`${session(run)}/stop`).pipe(Effect.asVoid),
    sendFeedback: (run, id, vote) =>
      post(`${session(run)}/feedback`, { id, vote, from: CLIENT_NAME }).pipe(Effect.asVoid),
    setOverrides: (run, overrides) => {
      const body = { terms: overrides.terms ?? {}, require: overrides.require ?? {}, areas: overrides.areas ?? [] };
      return request('PUT', `${session(run)}/rating/overrides`, body).pipe(Effect.asVoid);
    },
    getView: (run) =>
      get(`${session(run)}/view`).pipe(
        Effect.map(cleanView),
        Effect.catchIf(
          (error) => /No such route/.test(error.message),
          () => Effect.succeed<ResultsView>({}),
        ),
      ),
    setView: (run, view) => request('PUT', `${session(run)}/view`, cleanView(view)).pipe(Effect.map(cleanView)),
    extend: (run, input) =>
      post(`${session(run)}/extend`, input).pipe(
        Effect.map((json) => {
          const child = asString(asRecord(json)?.child);
          return child ? { child } : {};
        }),
      ),
    getEntity: (iri) => get(`/entities?iri=${encodeURIComponent(iri)}&provenance=1`).pipe(Effect.map(toEntity)),
    streamSession,
    getGraph: (iris, options) => {
      const query = new URLSearchParams({ iri: iris.join(',') });
      if (options?.depth !== undefined) {
        query.set('depth', String(options.depth));
      }
      if (options?.limit !== undefined) {
        query.set('limit', String(options.limit));
      }
      return get(`/graph?${query}`).pipe(Effect.map(toSubjectGraph));
    },
    getGraphNode: (iri) => get(`/graph/node?iri=${encodeURIComponent(iri)}`).pipe(Effect.map(toNodeFacts)),
    explain: (run) =>
      get(`${session(run)}/explain`).pipe(
        Effect.flatMap((json) => {
          const tree = toExplainNode(json);
          return tree
            ? Effect.succeed(tree)
            : Effect.fail(new LighthouseError(undefined, 'bad_response', { message: `No trace for ${run}.` }));
        }),
      ),
    listPlugins: () => get('/plugins').pipe(Effect.map(toPlugins)),
    listPredicates: () => get('/predicates').pipe(Effect.map(toPredicates)),
    listIssues: () => get('/issues').pipe(Effect.map(toIssues)),
    commentIssue: (id, text) =>
      post(`/issues/${encodeURIComponent(id)}/comment`, { text, from: CLIENT_NAME }).pipe(Effect.map(toIssue)),
    setIssueStatus: (id, status, note) =>
      request('PUT', `/issues/${encodeURIComponent(id)}/status`, {
        status,
        ...(note ? { note } : {}),
        from: CLIENT_NAME,
      }).pipe(Effect.map(toIssue)),
    getStorage: () => get('/storage').pipe(Effect.map((json) => asRecord(json) ?? {})),
    clearCache: (namespace) =>
      post('/storage/cache/clear', namespace ? { namespace } : {}).pipe(Effect.map((json) => asRecord(json) ?? {})),
    pruneSnapshots: (options) =>
      post('/storage/snapshots/prune', options).pipe(Effect.map((json) => asRecord(json) ?? {})),
  };
};

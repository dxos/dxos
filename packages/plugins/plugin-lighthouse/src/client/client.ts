//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

import { type RatingOverrides } from '../model/rating.ts';
import { asRecord, asString, toEngines, toEntity, toExtensions, toSession, toUpdate } from './decode.ts';
import { createSseParser } from './sse.ts';
import {
  type Budget,
  type Engine,
  type Entity,
  type Extension,
  type Session,
  type SessionUpdate,
  type Status,
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
  createSession(input: { goal: string; budget?: Budget }): Effect.Effect<{ run: string }, LighthouseError>;
  getSession(run: string): Effect.Effect<Session, LighthouseError>;
  sendMessage(run: string, text: string, options?: { model?: string }): Effect.Effect<void, LighthouseError>;
  stopSession(run: string): Effect.Effect<void, LighthouseError>;
  sendFeedback(run: string, id: string, vote: Vote): Effect.Effect<void, LighthouseError>;
  setOverrides(run: string, overrides: RatingOverrides): Effect.Effect<void, LighthouseError>;
  extend(
    run: string,
    input: { subject: string; extension: string; deep?: boolean },
  ): Effect.Effect<{ child?: string }, LighthouseError>;
  /** One subject's current facts with provenance. */
  getEntity(iri: string): Effect.Effect<Entity | undefined, LighthouseError>;
  streamSession(run: string, onUpdate: (update: SessionUpdate) => void): Effect.Effect<never>;
}

const RECONNECT_DELAY = '2 seconds';

const trimSlash = (url: string) => url.replace(/\/+$/, '');

/** Reads lighthouse's error body (`{ error: { code, message, hint } }`), the CLI's error shape. */
const toError = (status: number, body: unknown) => {
  const error = asRecord(asRecord(body)?.error);
  const message = [asString(error?.message) ?? `HTTP ${status}`, asString(error?.hint)].filter(Boolean).join(' — ');
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
    createSession: ({ goal, budget }) =>
      post('/sessions', { goal, ...(budget ? { budget } : {}), from: CLIENT_NAME }).pipe(
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
    sendMessage: (run, text, options) =>
      post(`${session(run)}/messages`, { text, ...options, from: CLIENT_NAME }).pipe(Effect.asVoid),
    stopSession: (run) => post(`${session(run)}/stop`).pipe(Effect.asVoid),
    sendFeedback: (run, id, vote) =>
      post(`${session(run)}/feedback`, { id, vote, from: CLIENT_NAME }).pipe(Effect.asVoid),
    setOverrides: (run, overrides) => {
      const body = { terms: overrides.terms ?? {}, require: overrides.require ?? {} };
      return request('PUT', `${session(run)}/rating/overrides`, body).pipe(Effect.asVoid);
    },
    extend: (run, input) =>
      post(`${session(run)}/extend`, input).pipe(
        Effect.map((json) => {
          const child = asString(asRecord(json)?.child);
          return child ? { child } : {};
        }),
      ),
    getEntity: (iri) => get(`/entities?iri=${encodeURIComponent(iri)}&provenance=1`).pipe(Effect.map(toEntity)),
    streamSession,
  };
};

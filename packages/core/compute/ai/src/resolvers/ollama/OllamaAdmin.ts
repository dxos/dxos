//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import type * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { OllamaError } from '../../errors';
import { DEFAULT_OLLAMA_ENDPOINT } from './OllamaResolver';

/**
 * An Ollama model as reported by `GET /api/tags`.
 */
export type Model = {
  name: string;
  size?: number;
  modifiedAt?: string;
  digest?: string;
  details?: Record<string, unknown>;
};

/**
 * Progress emitted per NDJSON line while pulling a model via `POST /api/pull`. Download phases
 * report `completed`/`total` for a single layer keyed by `digest`; consumers aggregate across
 * digests for overall progress.
 */
export type PullProgress = {
  status: string;
  digest?: string;
  completed?: number;
  total?: number;
};

/**
 * A model currently loaded into memory, as reported by `GET /api/ps`. `sizeVram` is the resident
 * VRAM footprint; `expiresAt` is when Ollama will unload it if idle.
 */
export type RunningModel = {
  name: string;
  size?: number;
  sizeVram?: number;
  expiresAt?: string;
};

/**
 * Effect-based client for the Ollama administrative REST API (model management). Every operation
 * requires an {@link HttpClient.HttpClient} (provide `FetchHttpClient.layer`) and fails with the
 * typed {@link OllamaError}; cancellation is via fiber interruption (no `AbortSignal`).
 */
export type Admin = {
  readonly endpoint: string;
  /** Installed models. */
  readonly list: Effect.Effect<Model[], OllamaError, HttpClient.HttpClient>;
  /** Models currently loaded into memory. */
  readonly ps: Effect.Effect<RunningModel[], OllamaError, HttpClient.HttpClient>;
  /** Load a model into memory and keep it resident until explicitly unloaded. */
  load: (name: string) => Effect.Effect<void, OllamaError, HttpClient.HttpClient>;
  /** Unload a model from memory. */
  unload: (name: string) => Effect.Effect<void, OllamaError, HttpClient.HttpClient>;
  /** Pull (download) a model, emitting one {@link PullProgress} per NDJSON frame until complete. */
  pull: (name: string) => Stream.Stream<PullProgress, OllamaError, HttpClient.HttpClient>;
  /** Delete an installed model. */
  remove: (name: string) => Effect.Effect<void, OllamaError, HttpClient.HttpClient>;
};

export type Options = {
  endpoint?: string;
};

// The HttpClient with trace propagation disabled: the headers it adds by default (`b3`,
// `traceparent`) are rejected by Ollama's CORS allow-list, blocking every request at preflight.
// Matches OllamaResolver, which disables it on the chat endpoint for the same reason.
const ollamaHttpClient = HttpClient.HttpClient.pipe(Effect.map(HttpClient.withTracerPropagation(false)));

/**
 * Client for the Ollama administrative REST API (model management). Distinct from
 * {@link OllamaResolver}, which adapts Ollama's chat endpoint to the language-model interface.
 *
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export const make = ({ endpoint = DEFAULT_OLLAMA_ENDPOINT }: Options = {}): Admin => {
  const list: Admin['list'] = mapErrors(
    Effect.scoped(
      Effect.gen(function* () {
        const client = yield* ollamaHttpClient;
        const response = yield* client.get(`${endpoint}/api/tags`);
        if (!isOk(response.status)) {
          return yield* Effect.fail(new OllamaError(`HTTP ${response.status}`));
        }
        // `/api/tags` returns untyped JSON; treat it as the documented wire shape (boundary).
        const data = (yield* response.json) as { models?: RawModel[] };
        return (data?.models ?? []).map(
          (model): Model => ({
            name: model.name ?? '',
            size: model.size,
            modifiedAt: model.modified_at,
            digest: model.digest,
            details: model.details,
          }),
        );
      }),
    ),
  );

  const ps: Admin['ps'] = mapErrors(
    Effect.scoped(
      Effect.gen(function* () {
        const client = yield* ollamaHttpClient;
        const response = yield* client.get(`${endpoint}/api/ps`);
        if (!isOk(response.status)) {
          return yield* Effect.fail(new OllamaError(`HTTP ${response.status}`));
        }
        const data = (yield* response.json) as { models?: RawRunningModel[] };
        return (data?.models ?? []).map(
          (model): RunningModel => ({
            name: model.name ?? '',
            size: model.size,
            sizeVram: model.size_vram,
            expiresAt: model.expires_at,
          }),
        );
      }),
    ),
  );

  // Ollama loads/unloads a model via an empty `/api/generate` request: `keep_alive: -1` pins it in
  // memory; `keep_alive: 0` evicts it.
  const setKeepAlive = (name: string, keepAlive: number): Effect.Effect<void, OllamaError, HttpClient.HttpClient> =>
    mapErrors(
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* ollamaHttpClient;
          const request = yield* HttpClientRequest.post(`${endpoint}/api/generate`).pipe(
            HttpClientRequest.bodyJson({ model: name, keep_alive: keepAlive, stream: false }),
          );
          const response = yield* client.execute(request);
          if (!isOk(response.status)) {
            return yield* Effect.fail(new OllamaError(yield* readErrorBody(response)));
          }
        }),
      ),
    );

  const load: Admin['load'] = (name) => setKeepAlive(name, -1);
  const unload: Admin['unload'] = (name) => setKeepAlive(name, 0);

  const pull: Admin['pull'] = (name) =>
    Stream.unwrapScoped(
      Effect.gen(function* () {
        const client = yield* ollamaHttpClient;
        const request = yield* HttpClientRequest.post(`${endpoint}/api/pull`).pipe(
          HttpClientRequest.bodyJson({ model: name, stream: true }),
        );
        const response = yield* client.execute(request);
        if (!isOk(response.status)) {
          return yield* Effect.fail(new OllamaError(`HTTP ${response.status}`));
        }
        // NDJSON: decode bytes to text and split into frames (handles UTF-8 and newlines split
        // across network chunks). A frame carrying `{ error }` fails the stream.
        return response.stream.pipe(Stream.decodeText(), Stream.splitLines, Stream.flatMap(pullFrame));
      }),
    ).pipe(Stream.mapError(toOllamaError));

  const remove: Admin['remove'] = (name) =>
    mapErrors(
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* ollamaHttpClient;
          const request = yield* HttpClientRequest.del(`${endpoint}/api/delete`).pipe(
            HttpClientRequest.bodyJson({ model: name }),
          );
          const response = yield* client.execute(request);
          if (!isOk(response.status)) {
            return yield* Effect.fail(new OllamaError(yield* readErrorBody(response)));
          }
        }),
      ),
    );

  return { endpoint, list, ps, load, unload, pull, remove };
};

/**
 * Snake_case wire shape of a model from `/api/tags`. JSON is untyped, so this documents the
 * fields read rather than enforcing them.
 */
type RawModel = {
  name?: string;
  size?: number;
  modified_at?: string;
  digest?: string;
  details?: Record<string, unknown>;
};

/** Snake_case wire shape of a running model from `/api/ps`. */
type RawRunningModel = {
  name?: string;
  size?: number;
  size_vram?: number;
  expires_at?: string;
};

const isOk = (status: number): boolean => status >= 200 && status < 300;

/** Normalize any failure (HttpClient transport/response/body, or a status check) to {@link OllamaError}. */
const toOllamaError = (error: unknown): OllamaError =>
  error instanceof OllamaError ? error : new OllamaError(formatError(error), { cause: error });

const mapErrors = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, OllamaError, R> =>
  Effect.mapError(effect, toOllamaError);

/**
 * Parse a single NDJSON pull frame into a {@link Stream}: a progress event, nothing (blank or
 * unparseable), or a terminal failure when the frame carries an `{ error }`.
 */
const pullFrame = (frame: string): Stream.Stream<PullProgress, OllamaError> => {
  const line = frame.trim();
  if (line.length === 0) {
    return Stream.empty;
  }
  let json: any;
  try {
    json = JSON.parse(line);
  } catch {
    return Stream.empty;
  }
  if (typeof json?.error === 'string') {
    return Stream.fail(new OllamaError(json.error));
  }
  return Stream.succeed({
    status: json?.status ?? '',
    digest: json?.digest,
    completed: json?.completed,
    total: json?.total,
  });
};

/** Extract the most useful error message from a non-OK response (Ollama returns `{ error }`). */
const readErrorBody = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<string> =>
  response.text.pipe(
    Effect.orElse(() => Effect.succeed('')),
    Effect.map((body) => {
      try {
        const json = JSON.parse(body);
        if (typeof json?.error === 'string' && json.error.length > 0) {
          return json.error;
        }
      } catch {}
      return body.trim().length > 0 ? `HTTP ${response.status}: ${body.slice(0, 300)}` : `HTTP ${response.status}`;
    }),
  );

/**
 * Reduce any failure to a message. HttpClient transport errors wrap the underlying cause (e.g. a
 * `fetch` `TypeError`), so surface the cause when the top-level message omits it.
 */
const formatError = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    const causeMessage = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : undefined;
    return causeMessage && !error.message.includes(causeMessage) ? `${error.message}: ${causeMessage}` : error.message;
  }
  return String(error);
};

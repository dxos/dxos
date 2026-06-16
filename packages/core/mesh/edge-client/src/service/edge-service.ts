//
// Copyright 2026 DXOS.org
//

// Lightweight client for EDGE-hosted HTTP services — intentionally free of the
// heavy transitive dependencies (`@dxos/context`, `@dxos/protocols`) that
// `BaseHttpClient` pulls in, so it bundles cleanly into browser / workerd. The
// only runtime dependencies are `effect` and `@dxos/log`.

import * as Data from 'effect/Data';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

// Matches EDGE_CLIENT_TAG_HEADER from @dxos/protocols. Duplicated here (as in
// `cors-proxy`) to avoid importing the heavy protocols bundle.
const EDGE_CLIENT_TAG_HEADER = 'X-DXOS-Client-Tag';

const DEFAULT_TIMEOUT = Duration.seconds(15);

/** Number of body characters retained for the error message on a non-2xx response. */
const ERROR_BODY_LIMIT = 512;

export type EdgeServiceClientOptions = {
  /** Base URL the service is hosted at; request paths resolve against it. */
  baseUrl: string;
  /** Tag included in the {@link EDGE_CLIENT_TAG_HEADER} header for metering. */
  clientTag?: string;
  /** Per-request timeout. */
  timeout?: Duration.DurationInput;
  /** Injectable for deterministic tests; defaults to `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Auth seam invoked per request; unused by the image service today. */
  authHeaders?: () => Effect.Effect<Record<string, string>>;
};

/** Single failure type for every transport, status, and decode error. */
export class EdgeServiceError extends Data.TaggedError('EdgeServiceError')<{
  message: string;
  status?: number;
  cause?: unknown;
}> {}

export class EdgeServiceClient {
  readonly #baseUrl: string;
  readonly #clientTag: string | undefined;
  readonly #timeout: Duration.Duration;
  readonly #fetch: typeof globalThis.fetch;
  readonly #authHeaders: (() => Effect.Effect<Record<string, string>>) | undefined;

  constructor(options: EdgeServiceClientOptions) {
    this.#baseUrl = options.baseUrl;
    this.#clientTag = options.clientTag;
    this.#timeout = Duration.decode(options.timeout ?? DEFAULT_TIMEOUT);
    // Bind so `fetch` keeps its expected `this` when injected as a method reference.
    const fetchImpl = options.fetch ?? globalThis.fetch;
    this.#fetch = fetchImpl.bind(globalThis);
    this.#authHeaders = options.authHeaders;
  }

  get baseUrl(): string {
    return this.#baseUrl;
  }

  /** POST a `FormData` (multipart) body and decode the JSON response. */
  postForm<A>(path: string, form: FormData, schema: Schema.Schema<A>): Effect.Effect<A, EdgeServiceError> {
    // The runtime sets `Content-Type: multipart/form-data` with the boundary;
    // setting it manually here would omit the boundary and break parsing.
    return this.#request(path, schema, { method: 'POST', body: form });
  }

  /** POST a JSON body and decode the JSON response. */
  postJson<A>(path: string, body: unknown, schema: Schema.Schema<A>): Effect.Effect<A, EdgeServiceError> {
    // Serialize inside the Effect so a circular/non-serializable body surfaces as
    // EdgeServiceError rather than throwing synchronously from the call site.
    return Effect.try({
      try: () => JSON.stringify(body),
      catch: (cause) => new EdgeServiceError({ message: 'Failed to serialize JSON request body', cause }),
    }).pipe(
      Effect.flatMap((json) =>
        this.#request(path, schema, {
          method: 'POST',
          body: json,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  }

  #request<A>(path: string, schema: Schema.Schema<A>, init: RequestInit): Effect.Effect<A, EdgeServiceError> {
    return Effect.gen(this, function* () {
      const url = new URL(path, this.#baseUrl);
      const headers = new Headers(init.headers ?? undefined);
      if (this.#clientTag) {
        headers.set(EDGE_CLIENT_TAG_HEADER, this.#clientTag);
      }
      if (this.#authHeaders) {
        const auth = yield* this.#authHeaders();
        for (const [key, value] of Object.entries(auth)) {
          headers.set(key, value);
        }
      }

      const response = yield* Effect.tryPromise({
        try: (signal) => this.#fetch(url, { ...init, headers, signal }),
        catch: (cause) => new EdgeServiceError({ message: `Request to ${url.pathname} failed`, cause }),
      });

      if (!response.ok) {
        // Body text aids debugging but may be large; truncate and never throw on read.
        const detail = yield* Effect.promise(() => response.text().catch(() => '')).pipe(
          Effect.map((text) => text.slice(0, ERROR_BODY_LIMIT)),
        );
        return yield* new EdgeServiceError({
          message: `Service responded ${response.status}${detail ? `: ${detail}` : ''}`,
          status: response.status,
        });
      }

      const json = yield* Effect.tryPromise({
        try: () => response.json(),
        catch: (cause) =>
          new EdgeServiceError({ message: 'Failed to parse JSON response', status: response.status, cause }),
      });

      return yield* Schema.decodeUnknown(schema)(json).pipe(
        Effect.mapError(
          (cause) =>
            new EdgeServiceError({ message: 'Response did not match expected schema', status: response.status, cause }),
        ),
      );
    }).pipe(
      Effect.timeoutFail({
        duration: this.#timeout,
        onTimeout: () => new EdgeServiceError({ message: `Request to ${path} timed out` }),
      }),
    );
  }
}

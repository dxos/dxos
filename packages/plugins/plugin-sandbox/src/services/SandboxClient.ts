//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as HttpBody from 'effect/unstable/http/HttpBody';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

export const SandboxRecord = Schema.Struct({
  id: Schema.String,
  spaceId: Schema.String,
  name: Schema.optional(Schema.String),
  baseImage: Schema.String,
  createdAt: Schema.String,
  expiresAt: Schema.String,
});
export type SandboxRecord = Schema.Schema.Type<typeof SandboxRecord>;

export const ExecResult = Schema.Struct({
  stdout: Schema.String,
  stderr: Schema.String,
  exitCode: Schema.Number,
  success: Schema.Boolean,
});
export type ExecResult = Schema.Schema.Type<typeof ExecResult>;

export const FileEntry = Schema.Struct({
  name: Schema.String,
  type: Schema.Literals(['file', 'directory']),
  size: Schema.optional(Schema.Number),
});
export type FileEntry = Schema.Schema.Type<typeof FileEntry>;

export type ExecRequest = {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
};

/**
 * Ceiling on any single sandbox request. The service bounds the container call itself, so this is
 * the backstop for the service never answering at all — which is what a hung `exec` looked like from
 * here: an unbounded `fetch` with no signal, wrapped in an uninterruptible `Effect.promise`, held a
 * connection open for forty minutes while the operation above it had already been terminated.
 */
const DEFAULT_TIMEOUT = Duration.minutes(3);

/** Shorter: creating a sandbox provisions a container, but never runs user code. */
const CREATE_TIMEOUT = Duration.seconds(90);

/** Metadata and file calls do no work in the container beyond the syscall. */
const METADATA_TIMEOUT = Duration.seconds(30);

export type SandboxRequestError =
  | HttpClientError.HttpClientError
  | HttpBody.HttpBodyError
  | Schema.SchemaError
  | Cause.TimeoutError;

type RequestEffect<T> = Effect.Effect<T, SandboxRequestError, HttpClient.HttpClient>;

/**
 * Supplies the `Authorization` header for a request, normally `EdgeHttpClient.getAuthHeader`.
 *
 * Resolved per request rather than captured: a client outlives an identity change, and a captured
 * header would keep presenting the previous identity's credential.
 */
export type AuthHeaderProvider = () => Promise<string | undefined>;

/**
 * Client for the sandbox-service REST API.
 *
 * `_base` is the service's base URL, normally `<edge>/sandbox`; the worker serves its routes at its
 * own root, so a path is appended directly.
 *
 * Every route of the service authenticates the caller and requires membership of the space in the
 * path, so `_authHeader` is not optional in practice — a client built without one gets 401s.
 *
 * Requests go through the Effect `HttpClient` rather than bare `fetch` for two reasons beyond
 * style: the client aborts the underlying request when the fiber is interrupted, so cancelling an
 * operation actually cancels the call; and it propagates the active span as `traceparent`, which is
 * what joins these requests to the service's own spans in one trace.
 */
export class SandboxClient {
  constructor(
    private readonly _base: string,
    private readonly _authHeader: AuthHeaderProvider,
  ) {}

  #url(path: string): string {
    return `${this._base.replace(/\/$/, '')}${path}`;
  }

  createSandbox(
    spaceId: string,
    sandboxId: string,
    options?: { name?: string; baseImage?: string; expiresIn?: number },
  ): RequestEffect<SandboxRecord> {
    return this.#send(
      HttpClientRequest.put(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}`)),
      options ?? {},
      Schema.Struct({ sandbox: SandboxRecord }),
      CREATE_TIMEOUT,
    ).pipe(Effect.map((body) => body.sandbox));
  }

  getSandbox(spaceId: string, sandboxId: string): RequestEffect<SandboxRecord> {
    return this.#send(
      HttpClientRequest.get(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}`)),
      undefined,
      Schema.Struct({ sandbox: SandboxRecord }),
      METADATA_TIMEOUT,
    ).pipe(Effect.map((body) => body.sandbox));
  }

  exec(spaceId: string, sandboxId: string, options: ExecRequest): RequestEffect<ExecResult> {
    // The caller's own `timeout` bounds the command inside the container; this bounds the request.
    // Kept above it so a command that times out server-side reports its own error rather than
    // surfacing as an indistinguishable client timeout.
    const timeout = options.timeout ? Duration.millis(options.timeout + 30_000) : DEFAULT_TIMEOUT;
    return this.#send(
      HttpClientRequest.post(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/exec`)),
      options,
      ExecResult,
      timeout,
    );
  }

  readFile(spaceId: string, sandboxId: string, path: string): RequestEffect<string> {
    return this.#send(
      HttpClientRequest.get(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/files`)).pipe(
        HttpClientRequest.setUrlParams({ path }),
      ),
      undefined,
      Schema.Struct({ content: Schema.String }),
      METADATA_TIMEOUT,
    ).pipe(Effect.map((body) => body.content));
  }

  writeFile(spaceId: string, sandboxId: string, path: string, content: string): RequestEffect<void> {
    return this.#send(
      HttpClientRequest.put(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/files`)).pipe(
        HttpClientRequest.setUrlParams({ path }),
      ),
      { content },
      Schema.Struct({ success: Schema.Boolean }),
      METADATA_TIMEOUT,
    ).pipe(Effect.asVoid);
  }

  listFiles(spaceId: string, sandboxId: string, path: string): RequestEffect<readonly FileEntry[]> {
    return this.#send(
      HttpClientRequest.get(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/files/list`)).pipe(
        HttpClientRequest.setUrlParams({ path }),
      ),
      undefined,
      Schema.Struct({ entries: Schema.Array(FileEntry) }),
      METADATA_TIMEOUT,
    ).pipe(Effect.map((body) => body.entries));
  }

  /**
   * Executes one request: JSON body when there is one, decode against `schema`, bounded by
   * `timeout`, and scoped so the response body is released even when the effect fails or is
   * interrupted. Deliberately no retry — `exec` is not idempotent, and re-running a command that may
   * already have taken effect is worse than reporting the failure.
   */
  #send<T>(
    request: HttpClientRequest.HttpClientRequest,
    body: unknown,
    schema: Schema.Codec<T>,
    timeout: Duration.Duration,
  ): RequestEffect<T> {
    const authHeader = this._authHeader;
    return Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const withBody = body === undefined ? request : yield* HttpClientRequest.bodyJson(request, body);
      const header = yield* Effect.promise(authHeader);
      const authorized = header ? HttpClientRequest.setHeader(withBody, 'Authorization', header) : withBody;
      return yield* httpClient.execute(authorized).pipe(
        Effect.flatMap((response) => Effect.flatMap(response.json, Schema.decodeUnknownEffect(schema))),
        Effect.timeout(timeout),
        Effect.scoped,
      );
    });
  }
}

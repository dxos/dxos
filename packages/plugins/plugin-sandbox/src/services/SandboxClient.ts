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

/**
 * Wire encoding of a file's `content`: `utf-8` carries text verbatim, `base64` carries bytes. The
 * service picks one per file from its MIME type when the caller names none.
 */
export const FileEncoding = Schema.Literals(['utf-8', 'base64']);
export type FileEncoding = Schema.Schema.Type<typeof FileEncoding>;

/**
 * A file read from the sandbox. `encoding`, `mimeType` and `size` are what the service reports about
 * the file; an older service sends `content` alone, which is then utf-8 text.
 */
export const ReadFileResult = Schema.Struct({
  content: Schema.String,
  encoding: Schema.optional(FileEncoding),
  mimeType: Schema.optional(Schema.String),
  size: Schema.optional(Schema.Number),
});
export type ReadFileResult = Schema.Schema.Type<typeof ReadFileResult>;

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
 * The service authenticates every route and requires membership of the space in the path, unless its
 * `EDGE_CONFIG.sandbox.noAuth` is set — so `_authHeader` is what keeps this client working once that
 * flag is turned off, not something the current deployment already refuses requests without.
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

  /**
   * Reads a file. Without `encoding` the service chooses per file — text as `utf-8`, anything else
   * as `base64` — and reports its choice in the result; see {@link readFileBytes} for the decoded form.
   */
  readFile(
    spaceId: string,
    sandboxId: string,
    path: string,
    options?: { encoding?: FileEncoding },
  ): RequestEffect<ReadFileResult> {
    return this.#send(
      HttpClientRequest.get(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/files`)).pipe(
        HttpClientRequest.setUrlParams({ path, ...(options?.encoding ? { encoding: options.encoding } : {}) }),
      ),
      undefined,
      ReadFileResult,
      METADATA_TIMEOUT,
    );
  }

  /**
   * Reads a file as bytes plus its MIME type. Text arrives utf-8 and is re-encoded; binary arrives
   * base64 and is decoded — so an image round-trips byte for byte. The type is the service's own
   * detection, never guessed from the path: a `.png` holding something else must not be served as one.
   */
  readFileBytes(spaceId: string, sandboxId: string, path: string): RequestEffect<{ bytes: Uint8Array; type: string }> {
    return this.readFile(spaceId, sandboxId, path).pipe(
      Effect.flatMap(({ content, encoding, mimeType }) =>
        Effect.map(
          encoding === 'base64'
            ? Schema.decodeUnknownEffect(Schema.Uint8ArrayFromBase64)(content)
            : Effect.succeed(new TextEncoder().encode(content)),
          (bytes) => ({ bytes, type: mimeType ?? (encoding === 'base64' ? 'application/octet-stream' : 'text/plain') }),
        ),
      ),
    );
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

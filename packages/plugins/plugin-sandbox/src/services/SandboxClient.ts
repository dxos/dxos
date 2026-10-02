//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as HttpBody from 'effect/http/HttpBody';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientError from 'effect/http/HttpClientError';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import type * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Schema from 'effect/Schema';

import { EdgeCredentialsHeaderCodec } from '@dxos/protocols';

import { EXEC_STREAM_CONTENT_TYPE, foldExecStream } from './exec-stream.ts';

/** A repository attached to a sandbox, and the git remote name commands in it address it by. */
export const AttachedRepository = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
export type AttachedRepository = Schema.Schema.Type<typeof AttachedRepository>;

export const SandboxRecord = Schema.Struct({
  id: Schema.String,
  spaceId: Schema.String,
  name: Schema.optional(Schema.String),
  baseImage: Schema.String,
  repositories: Schema.optional(Schema.Array(AttachedRepository)),
  createdAt: Schema.String,
  expiresAt: Schema.String,
});
export type SandboxRecord = Schema.Schema.Type<typeof SandboxRecord>;

export const ExecResult = Schema.Struct({
  stdout: Schema.String,
  stderr: Schema.String,
  exitCode: Schema.Number,
  success: Schema.Boolean,
  /** Set for a command started in the background, which is all that `success` then means. */
  processId: Schema.optional(Schema.String),
});
export type ExecResult = Schema.Schema.Type<typeof ExecResult>;

export const ExposedPort = Schema.Struct({
  port: Schema.Number,
  /** Public URL of the port, ending in `/`; the token in it is the only credential it needs. */
  url: Schema.String,
});
export type ExposedPort = Schema.Schema.Type<typeof ExposedPort>;

export const FileEntry = Schema.Struct({
  name: Schema.String,
  type: Schema.Literals(['file', 'directory']),
  size: Schema.optional(Schema.Number),
});
export type FileEntry = Schema.Schema.Type<typeof FileEntry>;

/**
 * Subprotocol a terminal socket is opened with. The service answers with it, which a browser requires
 * once any subprotocol is offered — and one is, since the credential travels as another.
 */
export const TERMINAL_PROTOCOL = 'dxos.sandbox.terminal.v1';

/** Where to open a sandbox's interactive shell: a WebSocket URL and the subprotocols to offer it. */
export const TerminalEndpoint = Schema.Struct({
  url: Schema.String,
  protocols: Schema.Array(Schema.String),
});
export type TerminalEndpoint = Schema.Schema.Type<typeof TerminalEndpoint>;

/** The grid a terminal opens with; it is resized over the socket from then on. */
export type TerminalSize = { cols?: number; rows?: number };

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
  /** Start the command and return at once, for a server that must outlive the request. */
  background?: boolean;
};

export type ExposePortOptions = {
  /** The server behind the port, restarted with the container. */
  command?: string;
  cwd?: string;
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

export type RequestEffect<T> = Effect.Effect<T, SandboxRequestError, HttpClient.HttpClient>;

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
    options?: { name?: string; baseImage?: string; expiresIn?: number; repositories?: readonly AttachedRepository[] },
  ): RequestEffect<SandboxRecord> {
    return send(
      HttpClientRequest.put(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}`)),
      options ?? {},
      Schema.Struct({ sandbox: SandboxRecord }),
      CREATE_TIMEOUT,
      this._authHeader,
    ).pipe(Effect.map((body) => body.sandbox));
  }

  /**
   * Replaces the repositories attached to a sandbox. Configuration of the sandbox, like its image:
   * every later command in it gets each repository as a git remote named after it.
   */
  setRepositories(
    spaceId: string,
    sandboxId: string,
    repositories: readonly AttachedRepository[],
  ): RequestEffect<SandboxRecord> {
    return send(
      HttpClientRequest.put(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/repositories`)),
      { repositories },
      Schema.Struct({ success: Schema.Literal(true), data: SandboxRecord }),
      METADATA_TIMEOUT,
      this._authHeader,
      { checkStatus: true },
    ).pipe(Effect.map((body) => body.data));
  }

  getSandbox(spaceId: string, sandboxId: string): RequestEffect<SandboxRecord> {
    return send(
      HttpClientRequest.get(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}`)),
      undefined,
      Schema.Struct({ sandbox: SandboxRecord }),
      METADATA_TIMEOUT,
      this._authHeader,
    ).pipe(Effect.map((body) => body.sandbox));
  }

  /**
   * Runs a command to its end. Asked for as a stream, whose heartbeat keeps a long command's request
   * open: answered once at the end, an install of several minutes lost its connection while it kept
   * running. A service that does not stream answers with the result itself, which is read as before.
   */
  exec(spaceId: string, sandboxId: string, options: ExecRequest): RequestEffect<ExecResult> {
    // The caller's own `timeout` bounds the command inside the container; this bounds the request.
    // Kept above it so a command that times out server-side reports its own error rather than
    // surfacing as an indistinguishable client timeout.
    const timeout = options.timeout ? Duration.millis(options.timeout + 30_000) : DEFAULT_TIMEOUT;
    const request = HttpClientRequest.post(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/exec`));
    if (options.background) {
      return send(request, options, ExecResult, timeout, this._authHeader);
    }
    return execute(
      HttpClientRequest.setHeader(request, 'Accept', EXEC_STREAM_CONTENT_TYPE),
      options,
      timeout,
      this._authHeader,
      (response) =>
        (response.headers['content-type'] ?? '').includes(EXEC_STREAM_CONTENT_TYPE)
          ? Effect.map(response.text, foldExecStream)
          : Effect.flatMap(response.json, Schema.decodeUnknownEffect(ExecResult)),
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
    return send(
      HttpClientRequest.get(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/files`)).pipe(
        HttpClientRequest.setUrlParams({ path, ...(options?.encoding ? { encoding: options.encoding } : {}) }),
      ),
      undefined,
      ReadFileResult,
      METADATA_TIMEOUT,
      this._authHeader,
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
    return send(
      HttpClientRequest.put(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/files`)).pipe(
        HttpClientRequest.setUrlParams({ path }),
      ),
      { content },
      Schema.Struct({ success: Schema.Boolean }),
      METADATA_TIMEOUT,
      this._authHeader,
    ).pipe(Effect.asVoid);
  }

  listFiles(spaceId: string, sandboxId: string, path: string): RequestEffect<readonly FileEntry[]> {
    return send(
      HttpClientRequest.get(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/files/list`)).pipe(
        HttpClientRequest.setUrlParams({ path }),
      ),
      undefined,
      Schema.Struct({ entries: Schema.Array(FileEntry) }),
      METADATA_TIMEOUT,
      this._authHeader,
    ).pipe(Effect.map((body) => body.entries));
  }

  /**
   * Where to open the sandbox's shell. A browser cannot put `Authorization` on a WebSocket upgrade, so
   * the presentation is carried as a subprotocol instead; it is minted here, per connection, because
   * its challenge nonce is single-use.
   */
  terminalEndpoint(spaceId: string, sandboxId: string, size: TerminalSize = {}): Effect.Effect<TerminalEndpoint> {
    return Effect.promise(this._authHeader).pipe(
      Effect.map((header) => {
        const url = new URL(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/terminal`));
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        size.cols && url.searchParams.set('cols', String(size.cols));
        size.rows && url.searchParams.set('rows', String(size.rows));
        const presentation = EdgeCredentialsHeaderCodec.decode(header);
        return {
          url: url.toString(),
          protocols: presentation
            ? [TERMINAL_PROTOCOL, EdgeCredentialsHeaderCodec.encodeWebSocketProtocol(presentation)]
            : [TERMINAL_PROTOCOL],
        };
      }),
    );
  }

  /**
   * Exposes `port` at a public URL. With `command`, the service starts the server behind it when it is
   * not running, and again whenever the container has restarted since.
   */
  exposePort(
    spaceId: string,
    sandboxId: string,
    port: number,
    options?: ExposePortOptions,
  ): RequestEffect<ExposedPort> {
    return send(
      HttpClientRequest.post(this.#url(`/spaces/${spaceId}/sandboxes/${sandboxId}/ports`)),
      { port, ...options },
      ExposedPort,
      METADATA_TIMEOUT,
      this._authHeader,
    );
  }
}

/**
 * Executes one request whose JSON answer is decoded against `schema`; see {@link execute}.
 *
 * With `checkStatus`, a non-2xx response fails as an `HttpClientError` carrying its status rather
 * than as a body that does not decode — what lets a caller tell "not found" from "broken".
 */
export const send = <T>(
  request: HttpClientRequest.HttpClientRequest,
  body: unknown,
  schema: Schema.Codec<T>,
  timeout: Duration.Duration,
  authHeader: AuthHeaderProvider,
  options: { checkStatus?: boolean } = {},
): RequestEffect<T> =>
  execute(
    request,
    body,
    timeout,
    authHeader,
    (response) => Effect.flatMap(response.json, Schema.decodeUnknownEffect(schema)),
    options,
  );

/**
 * Executes one request: JSON body when there is one, answer read by `read`, bounded by `timeout`,
 * and scoped so the response body is released even when the effect fails or is interrupted.
 * Deliberately no retry — `exec` is not idempotent, and re-running a command that may already have
 * taken effect is worse than reporting the failure.
 */
const execute = <T>(
  request: HttpClientRequest.HttpClientRequest,
  body: unknown,
  timeout: Duration.Duration,
  authHeader: AuthHeaderProvider,
  read: (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<T, SandboxRequestError>,
  { checkStatus = false }: { checkStatus?: boolean } = {},
): RequestEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const client = checkStatus ? HttpClient.filterStatusOk(httpClient) : httpClient;
    const withBody = body === undefined ? request : yield* HttpClientRequest.bodyJson(request, body);
    const header = yield* Effect.promise(authHeader);
    const authorized = header ? HttpClientRequest.setHeader(withBody, 'Authorization', header) : withBody;
    return yield* client.execute(authorized).pipe(Effect.flatMap(read), Effect.timeout(timeout), Effect.scoped);
  });

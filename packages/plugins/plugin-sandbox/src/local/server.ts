//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { posix } from 'node:path';

import { log } from '@dxos/log';

import * as SandboxService from '../types/SandboxService.ts';

/** Largest request body accepted: a file upload, base64-encoded. */
const MAX_BODY_BYTES = 96 * 1024 * 1024;

export type ServeOptions = {
  backend: SandboxService.Backend;
  /** Bearer token every request must carry: the only thing between another local process and a shell. */
  token: string;
  /** Port to listen on; 0 picks a free one. */
  port?: number;
};

export type SandboxServer = {
  readonly port: number;
  close(): Promise<void>;
};

/** Where a published directory is served: `/files/<key>/<path inside it>`. */
export const FILES_PREFIX = '/files/';

/** A directory `publish` exposed, keyed by the unguessable id in its URL. */
type Published = { spaceId: string; sandboxId: string; path: string };

/**
 * Serves `backend` on the loopback interface as one `POST /<method>` per backend method with a JSON
 * body; file contents travel as base64 so binary files survive.
 *
 * This is how a runtime that cannot spawn processes — the Tauri webview — reaches local sandboxes:
 * the desktop shell starts this server as a sidecar and the webview calls it through `HttpBackend.make`.
 *
 * `POST /publish` additionally serves one of a sandbox's directories read-only at `GET /files/<key>/…`,
 * without the token: the loaders that fetch what a sandbox built (the plugin manifest, `import()`, the
 * desktop app's asset cache) cannot send a header, so the key in the path is the credential. It is 128
 * random bits, minted per call and forgotten when the helper exits.
 */
export const serve = async ({ backend, token, port = 0 }: ServeOptions): Promise<SandboxServer> => {
  const expected = Buffer.from(`Bearer ${token}`);
  const published = new Map<string, Published>();
  const server = createServer((request, response) => {
    void handle(backend, expected, published, request, response).catch((error) => {
      log.catch(error);
      send(response, 500, { error: 'internal error' });
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('sandbox server is not listening on a TCP port');
  }
  return {
    port: address.port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

/** One backend call, decoded from a request. */
type Call =
  | { method: 'create'; spaceId: string; sandboxId: string; options: SandboxService.CreateOptions }
  | { method: 'exec'; spaceId: string; sandboxId: string; request: ExecRequestBody }
  | { method: 'read'; spaceId: string; sandboxId: string; path: string }
  | { method: 'write'; spaceId: string; sandboxId: string; path: string; content: string }
  | { method: 'list'; spaceId: string; sandboxId: string; path: string }
  | { method: 'publish'; spaceId: string; sandboxId: string; path: string };

type ExecRequestBody = { command: string; cwd?: string; env?: Record<string, string>; timeout?: number };

const handle = async (
  backend: SandboxService.Backend,
  expected: Buffer,
  published: Map<string, Published>,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  // Any origin may ask; only a holder of the token gets an answer.
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin ?? '*');
  // Whatever the preflight asks for: the webview's fetch is instrumented and adds trace headers (`traceparent`),
  // and a fixed list refused every call; the bearer token, not the header list, is what guards the shell.
  response.setHeader(
    'Access-Control-Allow-Headers',
    request.headers['access-control-request-headers'] ?? 'authorization, content-type',
  );
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
  if (request.method === 'OPTIONS') {
    send(response, 204);
    return;
  }

  // Any other name is a page that rebound its own DNS onto this port.
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(request.headers.host ?? '')) {
    send(response, 403, { error: 'forbidden host' });
    return;
  }
  if (request.method === 'GET' && (request.url ?? '').startsWith(FILES_PREFIX)) {
    // No bearer token guards these, so only a page on this machine (the app) may read them cross-origin.
    if (!isLocalOrigin(request.headers.origin)) {
      response.removeHeader('Access-Control-Allow-Origin');
    }
    await serveFile(backend, published, request.url ?? '', response);
    return;
  }
  const authorization = Buffer.from(request.headers.authorization ?? '');
  if (authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) {
    send(response, 401, { error: 'unauthorized' });
    return;
  }
  if (request.method !== 'POST') {
    send(response, 405, { error: 'method not allowed' });
    return;
  }

  let call: Call;
  try {
    call = parseCall((request.url ?? '').replace(/^\//, ''), await readJson(request));
  } catch (error) {
    send(response, 400, { error: error instanceof Error ? error.message : String(error) });
    return;
  }

  const exit = await Effect.runPromiseExit(
    call.method === 'publish' ? publish(backend, published, call) : dispatch(backend, call),
  );
  if (Exit.isSuccess(exit)) {
    send(response, 200, exit.value ?? {});
    return;
  }
  const failure = exit.cause.reasons.find((reason) => reason._tag === 'Fail');
  if (failure?._tag === 'Fail') {
    send(response, 422, { error: failure.error.message });
    return;
  }
  throw new Error('sandbox call died', { cause: exit.cause });
};

/** A loopback web origin, or the webview's own scheme; an absent `Origin` is a same-origin or non-browser request. */
const isLocalOrigin = (origin: string | undefined): boolean =>
  origin === undefined || /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|tauri:\/\/localhost)$/.test(origin);

/** Registers a directory for {@link serveFile}, once the backend confirms it is one. */
const publish = (
  backend: SandboxService.Backend,
  published: Map<string, Published>,
  { spaceId, sandboxId, path }: Published,
): Effect.Effect<{ path: string }, SandboxService.SandboxError> =>
  Effect.map(backend.listFiles(spaceId, sandboxId, path), () => {
    const key = randomBytes(16).toString('hex');
    published.set(key, { spaceId, sandboxId, path });
    return { path: `${FILES_PREFIX}${key}/` };
  });

/** Content types a module loader insists on; anything else keeps the type the backend sniffed. */
const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
};

/** Answers `GET /files/<key>/<path>` from the published directory, never from outside it. */
const serveFile = async (
  backend: SandboxService.Backend,
  published: Map<string, Published>,
  url: string,
  response: ServerResponse,
): Promise<void> => {
  const [key, ...rest] = url.slice(FILES_PREFIX.length).split('?')[0].split('/');
  const entry = published.get(key);
  let relative: string;
  try {
    relative = posix.normalize(rest.map(decodeURIComponent).join('/'));
  } catch {
    relative = '..';
  }
  if (!entry || relative === '.' || relative === '..' || relative.startsWith('../') || posix.isAbsolute(relative)) {
    send(response, 404, { error: 'not found' });
    return;
  }
  const exit = await Effect.runPromiseExit(
    backend.readFileBytes(entry.spaceId, entry.sandboxId, posix.join(entry.path, relative)),
  );
  if (!Exit.isSuccess(exit)) {
    send(response, 404, { error: 'not found' });
    return;
  }
  response.statusCode = 200;
  response.setHeader('Content-Type', CONTENT_TYPES[posix.extname(relative)] ?? exit.value.type);
  // This origin is same-site with the app's, so nothing served here may run as a document of its own.
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', 'sandbox');
  // A rebuild rewrites the files behind the same URL; a cached copy would load the last build.
  response.setHeader('Cache-Control', 'no-store');
  response.end(Buffer.from(exit.value.bytes));
};

const dispatch = (
  backend: SandboxService.Backend,
  call: Exclude<Call, { method: 'publish' }>,
): Effect.Effect<unknown, SandboxService.SandboxError> => {
  switch (call.method) {
    case 'create':
      return backend.create(call.spaceId, call.sandboxId, call.options);
    case 'exec':
      return backend.exec(call.spaceId, call.sandboxId, call.request);
    case 'read':
      return Effect.map(backend.readFileBytes(call.spaceId, call.sandboxId, call.path), ({ bytes, type }) => ({
        content: Buffer.from(bytes).toString('base64'),
        type,
      }));
    case 'write':
      return backend.writeFile(
        call.spaceId,
        call.sandboxId,
        call.path,
        new Uint8Array(Buffer.from(call.content, 'base64')),
      );
    case 'list':
      return Effect.map(backend.listFiles(call.spaceId, call.sandboxId, call.path), (entries) => ({ entries }));
  }
};

/** Decodes a request into a {@link Call}, throwing on anything malformed. */
const parseCall = (method: string, body: Record<string, unknown>): Call => {
  const spaceId = string(body, 'spaceId');
  const sandboxId = string(body, 'sandboxId');
  switch (method) {
    case 'create': {
      const options = isRecord(body.options) ? body.options : {};
      return {
        method,
        spaceId,
        sandboxId,
        options: {
          name: optionalString(options, 'name'),
          baseImage: optionalString(options, 'baseImage'),
          expiresIn: optionalNumber(options, 'expiresIn'),
        },
      };
    }
    case 'exec': {
      if (!isRecord(body.request)) {
        throw new Error('missing field: request');
      }
      const env = body.request.env;
      if (env !== undefined && !isStringRecord(env)) {
        throw new Error('env must map names to strings');
      }
      return {
        method,
        spaceId,
        sandboxId,
        request: {
          command: string(body.request, 'command'),
          cwd: optionalString(body.request, 'cwd'),
          timeout: optionalNumber(body.request, 'timeout'),
          env,
        },
      };
    }
    case 'read':
    case 'list':
    case 'publish':
      return { method, spaceId, sandboxId, path: string(body, 'path') };
    case 'write':
      return { method, spaceId, sandboxId, path: string(body, 'path'), content: string(body, 'content') };
    default:
      throw new Error(`unknown method: ${method}`);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');

const string = (record: Record<string, unknown>, name: string): string => {
  const value = record[name];
  if (typeof value !== 'string') {
    throw new Error(`missing field: ${name}`);
  }
  return value;
};

const optionalString = (record: Record<string, unknown>, name: string): string | undefined =>
  typeof record[name] === 'string' ? record[name] : undefined;

const optionalNumber = (record: Record<string, unknown>, name: string): number | undefined =>
  typeof record[name] === 'number' ? record[name] : undefined;

const readJson = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error('request body too large');
    }
    chunks.push(chunk);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  if (!isRecord(parsed)) {
    throw new Error('request body must be a JSON object');
  }
  return parsed;
};

const send = (response: ServerResponse, status: number, body?: unknown): void => {
  response.statusCode = status;
  if (body === undefined) {
    response.end();
    return;
  }
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
};

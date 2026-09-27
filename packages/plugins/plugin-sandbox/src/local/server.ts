//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { timingSafeEqual } from 'node:crypto';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';

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

/**
 * Serves `backend` on the loopback interface as one `POST /<method>` per backend method with a JSON
 * body; file contents travel as base64 so binary files survive.
 *
 * This is how a runtime that cannot spawn processes — the Tauri webview — reaches local sandboxes:
 * the desktop shell starts this server as a sidecar and the webview calls it through `HttpBackend.make`.
 */
export const serve = async ({ backend, token, port = 0 }: ServeOptions): Promise<SandboxServer> => {
  const expected = Buffer.from(`Bearer ${token}`);
  const server = createServer((request, response) => {
    void handle(backend, expected, request, response).catch((error) => {
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
  | { method: 'list'; spaceId: string; sandboxId: string; path: string };

type ExecRequestBody = { command: string; cwd?: string; env?: Record<string, string>; timeout?: number };

const handle = async (
  backend: SandboxService.Backend,
  expected: Buffer,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  // Any origin may ask; only a holder of the token gets an answer.
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin ?? '*');
  response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Vary', 'Origin');
  if (request.method === 'OPTIONS') {
    send(response, 204);
    return;
  }

  // Any other name is a page that rebound its own DNS onto this port.
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(request.headers.host ?? '')) {
    send(response, 403, { error: 'forbidden host' });
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

  const exit = await Effect.runPromiseExit(dispatch(backend, call));
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

const dispatch = (backend: SandboxService.Backend, call: Call): Effect.Effect<unknown, SandboxService.SandboxError> => {
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

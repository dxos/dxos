//
// Copyright 2026 DXOS.org
//

// A standalone entrypoint, not a barrel namespace: it binds `node:http`, which the workerd hosts
// importing `@dxos/mcp-server` must never pull in.

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';

import { log } from '@dxos/log';

import { ToolFailure, failure } from './internal/failure.ts';

/** Matches EDGE's `createUpload`: minutes, since the credential rides in a URL and lands in logs. */
const URL_TTL_MS = 10 * 60 * 1000;

/** Matches `MAX_EDGE_BLOB_SIZE`: the staged bytes end up in the same store. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Bounds on what one process holds. The stage is reachable by any local caller, so without them a
 * loop of `createUpload` calls grows it until the process runs out of memory.
 */
const MAX_PENDING_UPLOADS = 64;
const MAX_STAGED_BYTES = 4 * MAX_UPLOAD_BYTES;

type PendingUpload = {
  readonly token: Buffer;
  /** When the URL stops accepting bytes; a received upload is kept until {@link RECEIVED_TTL_MS}. */
  readonly expiresAt: number;
  readonly name?: string;
  received?: StagedUpload & { readonly receivedAt: number };
};

/** How long received bytes wait for `file.createFromUpload`; the URL's own TTL guards only the credential. */
const RECEIVED_TTL_MS = 30 * 60 * 1000;

export type StagedUpload = {
  readonly bytes: Uint8Array;
  readonly type: string;
  readonly name?: string;
};

/**
 * Loopback twin of EDGE's signed upload URL, for a host that shares a machine with its caller
 * (`dx mcp serve`, the eval harness's in-process server).
 *
 * The caller `curl`s a local file to a port on `127.0.0.1` and names the upload by id. Each URL
 * carries a random token checked in constant time, because loopback is reachable by every process
 * (and every browser tab) on the machine, not only by the agent that asked for it.
 */
export class Stage {
  readonly #uploads = new Map<string, PendingUpload>();
  /** Bytes of bodies still streaming, so concurrent PUTs cannot together overrun {@link MAX_STAGED_BYTES}. */
  #inflightBytes = 0;
  #server?: Promise<{ server: Server; origin: string }>;

  /** Reserves an upload slot and returns where to `PUT` its bytes. */
  async mint(name?: string) {
    this.#prune();
    if (this.#uploads.size >= MAX_PENDING_UPLOADS) {
      throw new Error(`Too many pending uploads (${MAX_PENDING_UPLOADS}); create files from the ones already made.`);
    }
    const { origin } = await this.#listen();
    const uploadId = randomBytes(16).toString('hex');
    const token = randomBytes(24);
    const expiresAt = Date.now() + URL_TTL_MS;
    this.#uploads.set(uploadId, { token, expiresAt, name });

    const url = new URL(`/upload/${uploadId}`, origin);
    url.searchParams.set('sig', token.toString('hex'));
    return {
      uploadId,
      url: url.toString(),
      method: 'PUT' as const,
      expiresAt: new Date(expiresAt).toISOString(),
      maxBytes: MAX_UPLOAD_BYTES,
      command: `curl --fail-with-body -T ${shellQuote(`./${name ?? 'FILE'}`)} ${shellQuote(url.toString())}`,
    };
  }

  /** A completed upload, left in place; `undefined` if it never arrived or has expired. */
  peek(uploadId: string): StagedUpload | undefined {
    this.#prune();
    return this.#uploads.get(uploadId)?.received;
  }

  /** Releases a completed upload once it has been stored, so a failed create can be retried. */
  consume(uploadId: string): void {
    this.#uploads.delete(uploadId);
  }

  async close(): Promise<void> {
    const listening = await this.#server;
    this.#server = undefined;
    this.#uploads.clear();
    if (listening) {
      listening.server.closeAllConnections();
      await new Promise<void>((resolve) => listening.server.close(() => resolve()));
    }
  }

  /** Drops slots whose URL expired unused and bytes nobody collected in time. */
  #prune(): void {
    const now = Date.now();
    for (const [uploadId, pending] of this.#uploads) {
      const expired = pending.received ? pending.received.receivedAt + RECEIVED_TTL_MS < now : pending.expiresAt < now;
      if (expired) {
        this.#uploads.delete(uploadId);
      }
    }
  }

  #stagedBytes(): number {
    let total = 0;
    for (const pending of this.#uploads.values()) {
      total += pending.received?.bytes.byteLength ?? 0;
    }
    return total;
  }

  #listen() {
    this.#server ??= new Promise((resolve, reject) => {
      const server = createServer((request, response) => {
        void this.#handle(request, response).catch((error) => {
          log.catch(error);
          if (!response.headersSent) {
            respond(response, 500, 'Upload failed.');
          }
        });
      });
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          resolve({ server, origin: `http://127.0.0.1:${address.port}` });
        } else {
          reject(new Error('Upload server has no TCP address.'));
        }
      });
    });
    return this.#server;
  }

  async #handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    this.#prune();
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const match = /^\/upload\/([0-9a-f]{32})$/.exec(url.pathname);
    if (request.method !== 'PUT' || !match) {
      return reject(request, response, 404, 'Not found.');
    }

    const pending = this.#uploads.get(match[1]);
    const signature = Buffer.from(url.searchParams.get('sig') ?? '', 'hex');
    if (
      !pending ||
      signature.length !== pending.token.length ||
      !timingSafeEqual(signature, pending.token) ||
      pending.expiresAt < Date.now()
    ) {
      return reject(request, response, 403, 'Invalid or expired upload URL.');
    }
    if (pending.received) {
      return reject(request, response, 409, 'Upload already received.');
    }
    const limit = Math.min(MAX_UPLOAD_BYTES, MAX_STAGED_BYTES - this.#stagedBytes() - this.#inflightBytes);
    if (Number(request.headers['content-length'] ?? 0) > limit) {
      return reject(request, response, 413, `Upload exceeds the ${limit}-byte limit.`);
    }

    const chunks: Buffer[] = [];
    let size = 0;
    try {
      // Not destroyed on an early return, so `reject` can still drain the body and answer 413.
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        this.#inflightBytes += chunk.length;
        if (size > MAX_UPLOAD_BYTES || this.#stagedBytes() + this.#inflightBytes > MAX_STAGED_BYTES) {
          return reject(request, response, 413, `Upload exceeds the ${limit}-byte limit.`);
        }
        chunks.push(chunk);
      }
    } finally {
      this.#inflightBytes -= size;
    }
    // Re-checked after the body: a second PUT on the same URL may have landed while this one streamed.
    if (pending.received) {
      return respond(response, 409, 'Upload already received.');
    }

    const bytes = new Uint8Array(Buffer.concat(chunks));
    const type = detectType(bytes, request.headers['content-type']);
    pending.received = { bytes, type, name: pending.name, receivedAt: Date.now() };
    log.info('staged local upload', { uploadId: match[1], size, type });
    respond(response, 200, JSON.stringify({ uploadId: match[1], size, type }));
  }
}

/** Single-quotes a word for a POSIX shell, so a file name with spaces, quotes or `$` stays one argument. */
const shellQuote = (word: string) => `'${word.replaceAll("'", `'\\''`)}'`;

/** Answers without reading the body, draining it so the client sees the status rather than a reset. */
const reject = (request: IncomingMessage, response: ServerResponse, status: number, body: string) => {
  request.resume();
  respond(response, status, body);
};

const respond = (response: ServerResponse, status: number, body: string) => {
  response.writeHead(status, { 'Content-Type': status === 200 ? 'application/json' : 'text/plain' });
  response.end(body);
};

/** Leading bytes of the formats agents upload most; `curl -T` sends no content type of its own. */
const SIGNATURES: ReadonlyArray<readonly [type: string, magic: readonly number[]]> = [
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/gif', [0x47, 0x49, 0x46, 0x38]],
  ['application/pdf', [0x25, 0x50, 0x44, 0x46]],
  ['video/webm', [0x1a, 0x45, 0xdf, 0xa3]],
];

/** What the bytes are, sniffed first; the declared type is only a fallback for formats not listed above. */
const detectType = (bytes: Uint8Array, declared: string | undefined): string => {
  for (const [type, magic] of SIGNATURES) {
    if (magic.every((byte, index) => bytes[index] === byte)) {
      return type;
    }
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    return 'image/webp';
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp') {
    return String.fromCharCode(...bytes.slice(8, 12)) === 'qt  ' ? 'video/quicktime' : 'video/mp4';
  }
  if (declared && declared !== 'application/x-www-form-urlencoded') {
    return declared;
  }
  // Logs, CSV, Markdown and JSON have no signature; strict UTF-8 tells them from arbitrary binary.
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'text/plain';
  } catch {
    return 'application/octet-stream';
  }
};

/**
 * Same name, parameters and result as EDGE's `createUpload`, so one skill text drives both hosts:
 * `createUpload`, then the returned `curl`, then `file.createFromUpload` with the id.
 */
export const CreateUpload = Tool.make('createUpload', {
  description:
    'Returns a short-lived URL for uploading a local file directly to the space, bypassing the ' +
    'conversation entirely. Use this for any file already on disk — screenshots, screen recordings, ' +
    'logs, PDFs — since file bytes passed as tool arguments have to be generated token by token. ' +
    'Upload the bytes with the returned command, then call the org.dxos.operation.file.createFromUpload ' +
    'operation with the uploadId to create the File object in a space. The URL expires in minutes.',
  parameters: Schema.Struct({
    name: Schema.optional(
      Schema.String.annotate({ description: 'Filename to record on the resulting file object, e.g. capture.png.' }),
    ),
    size: Schema.optional(
      Schema.Number.annotate({
        description: 'Size of the file in bytes, if known. Used only to fail fast when it exceeds the limit.',
      }),
    ),
  }),
  failure: ToolFailure,
  success: Schema.Struct({
    uploadId: Schema.String.annotate({
      description: 'Pass this to org.dxos.operation.file.createFromUpload once the upload succeeds.',
    }),
    url: Schema.String,
    method: Schema.Literal('PUT'),
    expiresAt: Schema.String.annotate({ description: 'ISO 8601 instant after which the URL is refused.' }),
    maxBytes: Schema.Number,
    command: Schema.String.annotate({
      description: 'Ready-to-run upload command; replace the path with the file to upload.',
    }),
  }),
})
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, false);

export const UploadToolkit = Toolkit.make(CreateUpload);

/** Binds {@link CreateUpload} to one stage. */
export const handlers = (stage: Stage) =>
  UploadToolkit.of({
    createUpload: ({ name, size }) =>
      Effect.gen(function* () {
        if (size !== undefined && size > MAX_UPLOAD_BYTES) {
          return yield* Effect.fail(
            failure('invalid_request', `File is ${size} bytes; the per-upload limit is ${MAX_UPLOAD_BYTES}.`),
          );
        }
        return yield* Effect.tryPromise({
          try: () => stage.mint(name),
          catch: (error) => failure('operation_failed', error instanceof Error ? error.message : String(error)),
        });
      }),
  });

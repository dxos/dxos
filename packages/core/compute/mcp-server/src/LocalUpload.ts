//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

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
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type PendingUpload = {
  readonly token: Buffer;
  readonly expiresAt: number;
  readonly name?: string;
  received?: StagedUpload;
};

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
  #server?: Promise<{ server: Server; origin: string }>;

  /** Reserves an upload slot and returns where to `PUT` its bytes. */
  async mint(name?: string) {
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
      command: `curl --fail-with-body -T ${name ? `./${name}` : './FILE'} '${url.toString()}'`,
    };
  }

  /** Hands over a completed upload exactly once; `undefined` if it never arrived or expired. */
  take(uploadId: string): StagedUpload | undefined {
    const pending = this.#uploads.get(uploadId);
    if (!pending?.received || pending.expiresAt < Date.now()) {
      return undefined;
    }
    this.#uploads.delete(uploadId);
    return pending.received;
  }

  async close(): Promise<void> {
    const listening = await this.#server;
    listening?.server.close();
  }

  #listen() {
    this.#server ??= new Promise((resolve, reject) => {
      const server = createServer((request, response) => {
        void this.#handle(request, response).catch((error) => {
          log.catch(error);
          respond(response, 500, 'Upload failed.');
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
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const match = /^\/upload\/([0-9a-f]{32})$/.exec(url.pathname);
    if (request.method !== 'PUT' || !match) {
      return respond(response, 404, 'Not found.');
    }

    const pending = this.#uploads.get(match[1]);
    const signature = Buffer.from(url.searchParams.get('sig') ?? '', 'hex');
    if (
      !pending ||
      signature.length !== pending.token.length ||
      !timingSafeEqual(signature, pending.token) ||
      pending.expiresAt < Date.now()
    ) {
      return respond(response, 403, 'Invalid or expired upload URL.');
    }
    if (pending.received) {
      return respond(response, 409, 'Upload already received.');
    }

    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) {
        return respond(response, 413, `Upload exceeds ${MAX_UPLOAD_BYTES} bytes.`);
      }
      chunks.push(chunk);
    }

    const bytes = new Uint8Array(Buffer.concat(chunks));
    pending.received = { bytes, type: detectType(bytes, request.headers['content-type']), name: pending.name };
    log.info('staged local upload', { uploadId: match[1], size, type: pending.received.type });
    respond(response, 200, JSON.stringify({ uploadId: match[1], size, type: pending.received.type }));
  }
}

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

/** What the bytes are, measured rather than taken from the caller — the same rule EDGE applies. */
const detectType = (bytes: Uint8Array, declared: string | undefined): string => {
  for (const [type, magic] of SIGNATURES) {
    if (magic.every((byte, index) => bytes[index] === byte)) {
      return type;
    }
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    return 'image/webp';
  }
  return declared && declared !== 'application/x-www-form-urlencoded' ? declared : 'application/octet-stream';
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
        return yield* Effect.promise(() => stage.mint(name));
      }),
  });


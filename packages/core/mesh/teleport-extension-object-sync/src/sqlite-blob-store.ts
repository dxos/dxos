//
// Copyright 2025 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { synchronized } from '@dxos/async';
import { subtleCrypto } from '@dxos/crypto';
import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols/proto';
import { BlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';
import { type BlobChunk } from '@dxos/protocols/proto/dxos/mesh/teleport/blobsync';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { BitField, arrayToBuffer } from '@dxos/util';

import { type BlobStoreApi, BlobStoreApiService, DEFAULT_CHUNK_SIZE, type GetOptions } from './blob-store';

const BlobMetaCodec = schema.getCodecForType('dxos.echo.blob.BlobMeta');

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

export type SqliteBlobStoreProps = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
};

/**
 * SQLite-backed BlobStore.
 * Stores blob metadata and data in `blobs_meta` and `blobs_data` tables.
 */
export class SqliteBlobStore implements BlobStoreApi {
  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;

  constructor({ runtime }: SqliteBlobStoreProps) {
    this.#runtime = runtime;
  }

  /**
   * Creates the blobs_meta and blobs_data tables if they do not exist.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> = Effect.fn(
    'SqliteBlobStore.migrate',
  )(() =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE IF NOT EXISTS blobs_meta (
          id TEXT PRIMARY KEY,
          meta BLOB NOT NULL
        )`;
      yield* sql`CREATE TABLE IF NOT EXISTS blobs_data (
          id TEXT PRIMARY KEY,
          data BLOB NOT NULL
        )`;
      log('blobs tables ready');
    }).pipe(Effect.withSpan('SqliteBlobStore.migrate')),
  )();

  @synchronized
  async getMeta(id: Uint8Array): Promise<BlobMeta | undefined> {
    return this.#getMeta(id);
  }

  @synchronized
  async get(id: Uint8Array, options: GetOptions = {}): Promise<Uint8Array> {
    const metadata = await this.#getMeta(id);
    if (!metadata) {
      throw new Error('Blob not available');
    }

    const { offset = 0, length = metadata.length } = options;
    if (
      !Number.isInteger(offset) ||
      !Number.isInteger(length) ||
      offset < 0 ||
      length < 0 ||
      offset + length > metadata.length
    ) {
      throw new Error('Invalid range');
    }

    if (metadata.state === BlobMeta.State.FULLY_PRESENT) {
      const data = await this.#getData(id);
      if (!data) {
        throw new Error('Blob data missing');
      }
      return data.subarray(offset, offset + length);
    } else if (options.offset === undefined && options.length === undefined) {
      throw new Error('Blob not available');
    }

    const beginChunk = Math.floor(offset / metadata.chunkSize);
    const endChunk = Math.ceil((offset + length) / metadata.chunkSize);
    invariant(metadata.bitfield, 'Bitfield not present');
    invariant(metadata.bitfield.length * 8 >= endChunk, 'Invalid bitfield length');

    const present = BitField.count(metadata.bitfield, beginChunk, endChunk) === endChunk - beginChunk;
    if (!present) {
      throw new Error('Blob not available');
    }

    const data = await this.#getData(id);
    if (!data) {
      throw new Error('Blob data missing');
    }
    return data.subarray(offset, offset + length);
  }

  @synchronized
  async list(): Promise<BlobMeta[]> {
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ id: string; meta: Uint8Array }>`SELECT id, meta FROM blobs_meta`;
      }),
    );
    return rows.map((row) => BlobMetaCodec.decode(row.meta));
  }

  @synchronized
  async set(data: Uint8Array): Promise<BlobMeta> {
    const id = new Uint8Array(await subtleCrypto.digest('SHA-256', data as Uint8Array<ArrayBuffer>));
    const bitfield = BitField.ones(Math.ceil(data.length / DEFAULT_CHUNK_SIZE));
    const meta: BlobMeta = {
      id,
      state: BlobMeta.State.FULLY_PRESENT,
      length: data.length,
      chunkSize: DEFAULT_CHUNK_SIZE,
      bitfield,
      created: new Date(),
      updated: new Date(),
    };
    const idHex = arrayToBuffer(id).toString('hex');
    const encodedMeta = arrayToBuffer(BlobMetaCodec.encode(meta));
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT OR REPLACE INTO blobs_meta (id, meta) VALUES (${idHex}, ${encodedMeta})`;
        yield* sql`INSERT OR REPLACE INTO blobs_data (id, data) VALUES (${idHex}, ${data})`;
      }),
    );
    return meta;
  }

  @synchronized
  async setChunk(chunk: BlobChunk): Promise<BlobMeta> {
    const idHex = arrayToBuffer(chunk.id).toString('hex');

    let meta = await this.#getMeta(chunk.id);
    if (!meta) {
      invariant(chunk.totalLength, 'totalLength is not present');
      meta = {
        id: chunk.id,
        state: BlobMeta.State.PARTIALLY_PRESENT,
        length: chunk.totalLength,
        chunkSize: chunk.chunkSize ?? DEFAULT_CHUNK_SIZE,
        created: new Date(),
      };
      meta.bitfield = BitField.zeros(Math.ceil(meta.length / meta.chunkSize));
    }

    if (chunk.chunkSize && chunk.chunkSize !== meta.chunkSize) {
      throw new Error('Invalid chunk size');
    }

    invariant(meta.bitfield, 'Bitfield not present');
    invariant(chunk.chunkOffset !== undefined, 'chunkOffset is not present');

    if (chunk.chunkOffset < 0 || chunk.chunkOffset + chunk.payload.length > meta.length) {
      throw new Error('Invalid chunk range');
    }

    // Write chunk into existing or new data blob.
    const existingData = (await this.#getData(chunk.id)) ?? new Uint8Array(meta.length);
    const newData = Buffer.from(existingData);
    Buffer.from(chunk.payload).copy(newData, chunk.chunkOffset);

    BitField.set(meta.bitfield, Math.floor(chunk.chunkOffset / meta.chunkSize), true);

    const totalChunks = Math.ceil(meta.length / meta.chunkSize);
    if (BitField.count(meta.bitfield, 0, totalChunks) === totalChunks) {
      meta.state = BlobMeta.State.FULLY_PRESENT;
    }
    meta.updated = new Date();

    const encodedMeta = arrayToBuffer(BlobMetaCodec.encode(meta));
    const id = chunk.id;
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT OR REPLACE INTO blobs_meta (id, meta) VALUES (${idHex}, ${encodedMeta})`;
        yield* sql`INSERT OR REPLACE INTO blobs_data (id, data) VALUES (${idHex}, ${newData})`;
      }),
    );
    return meta;
  }

  async #getMeta(id: Uint8Array): Promise<BlobMeta | undefined> {
    const idHex = arrayToBuffer(id).toString('hex');
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ meta: Uint8Array }>`SELECT meta FROM blobs_meta WHERE id = ${idHex}`;
      }),
    );
    if (rows.length === 0) {
      return undefined;
    }
    return BlobMetaCodec.decode(rows[0].meta);
  }

  async #getData(id: Uint8Array): Promise<Uint8Array | undefined> {
    const idHex = arrayToBuffer(id).toString('hex');
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ data: Uint8Array }>`SELECT data FROM blobs_data WHERE id = ${idHex}`;
      }),
    );
    if (rows.length === 0) {
      return undefined;
    }
    return rows[0].data;
  }
}

/**
 * Effect Layer constructing a {@link SqliteBlobStore} from the ambient SQL runtime.
 */
export const SqliteBlobStoreLayer = (): Layer.Layer<
  BlobStoreApiService,
  never,
  SqlClient.SqlClient | SqlTransactionTag
> =>
  Layer.effect(
    BlobStoreApiService,
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>();
      return new SqliteBlobStore({ runtime });
    }),
  );

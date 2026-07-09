//
// Copyright 2025 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, synchronized } from '@dxos/async';
import { subtleCrypto } from '@dxos/crypto';
import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';
import { type KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { ComplexMap, arrayToBuffer } from '@dxos/util';

import { KeyringApiService, type KeyringApi } from './keyring';

const KeyRecordCodec = schema.getCodecForType('dxos.halo.keyring.KeyRecord');

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

export type SqliteKeyringOptions = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
};

/**
 * SQLite-backed Keyring.
 * Stores ECDSA key pairs in the `keyring` table.
 */
export class SqliteKeyring implements KeyringApi {
  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  readonly #keyCache = new ComplexMap<PublicKey, CryptoKeyPair>(PublicKey.hash);
  readonly keysUpdate = new Event();

  constructor({ runtime }: SqliteKeyringOptions) {
    invariant(subtleCrypto, 'SubtleCrypto not available in this environment.');
    this.#runtime = runtime;
  }

  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> = Effect.fn(
    'SqliteKeyring.migrate',
  )(() =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE IF NOT EXISTS keyring (
          public_key TEXT PRIMARY KEY,
          record BLOB NOT NULL
        )`;
    }).pipe(Effect.withSpan('SqliteKeyring.migrate')),
  )();

  async sign(key: PublicKey, message: Uint8Array): Promise<Uint8Array> {
    const keyPair = await this._getKey(key);
    return new Uint8Array(
      await subtleCrypto.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        keyPair.privateKey,
        message as Uint8Array<ArrayBuffer>,
      ),
    );
  }

  async createKey(): Promise<PublicKey> {
    const keyPair = await subtleCrypto.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    await this._setKey(keyPair);
    return keyPairToPublicKey(keyPair);
  }

  async importKeyPair(keyPair: CryptoKeyPair): Promise<PublicKey> {
    await this._setKey(keyPair);
    return keyPairToPublicKey(keyPair);
  }

  async list(): Promise<KeyRecord[]> {
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ record: Uint8Array }>`SELECT record FROM keyring`;
      }),
    );
    return rows.map((row) => {
      const record = KeyRecordCodec.decode(row.record);
      // Never expose private key material to callers.
      return { publicKey: record.publicKey };
    });
  }

  @synchronized
  private async _getKey(key: PublicKey): Promise<CryptoKeyPair> {
    if (this.#keyCache.has(key)) {
      return this.#keyCache.get(key)!;
    }

    const keyHex = key.toHex();
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ record: Uint8Array }>`SELECT record FROM keyring WHERE public_key = ${keyHex}`;
      }),
    );

    if (rows.length === 0) {
      throw new Error(`Key not found: ${keyHex}`);
    }

    const record = KeyRecordCodec.decode(rows[0].record);
    const publicKey = PublicKey.from(record.publicKey);
    invariant(key.equals(publicKey), 'Corrupted keyring: key mismatch');
    invariant(record.privateKey, 'Corrupted keyring: missing private key');

    const keyPair: CryptoKeyPair = {
      publicKey: await subtleCrypto.importKey(
        'raw',
        record.publicKey as Uint8Array<ArrayBuffer>,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify'],
      ),
      privateKey: await subtleCrypto.importKey(
        'pkcs8',
        record.privateKey as Uint8Array<ArrayBuffer>,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign'],
      ),
    };

    this.#keyCache.set(publicKey, keyPair);
    return keyPair;
  }

  @synchronized
  private async _setKey(keyPair: CryptoKeyPair): Promise<void> {
    const publicKey = await keyPairToPublicKey(keyPair);
    this.#keyCache.set(publicKey, keyPair);

    const record: KeyRecord = {
      publicKey: publicKey.asUint8Array(),
      privateKey: new Uint8Array(await subtleCrypto.exportKey('pkcs8', keyPair.privateKey)),
    };

    const keyHex = publicKey.toHex();
    const encodedRecord = arrayToBuffer(KeyRecordCodec.encode(record));
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT OR REPLACE INTO keyring (public_key, record) VALUES (${keyHex}, ${encodedRecord})`;
      }),
    );
    this.keysUpdate.emit();
  }
}

const keyPairToPublicKey = async (keyPair: CryptoKeyPair): Promise<PublicKey> =>
  PublicKey.from(new Uint8Array(await subtleCrypto.exportKey('raw', keyPair.publicKey)));

/**
 * Effect Layer constructing a {@link SqliteKeyring} from the ambient SQL runtime.
 */
export const SqliteKeyringLayer = (): Layer.Layer<
  KeyringApiService,
  never,
  SqlClient.SqlClient | SqlTransactionTag
> =>
  Layer.effect(
    KeyringApiService,
    Effect.gen(function* () {
      const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>();
      return new SqliteKeyring({ runtime });
    }),
  );

//
// Copyright 2025 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import CRC32 from 'crc-32';
import * as Effect from 'effect/Effect';

import { Event, scheduleTaskInterval, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataCorruptionError, STORAGE_VERSION } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { Invitation, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import {
  type ControlPipelineSnapshot,
  type EchoMetadata,
  type EdgeReplicationSetting,
  type IdentityRecord,
  type LargeSpaceMetadata,
  type SpaceCache,
  type SpaceMetadata,
} from '@dxos/protocols/proto/dxos/echo/metadata';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { type Timeframe } from '@dxos/timeframe';
import { ComplexMap, arrayToBuffer, forEachAsync, isNonNullable } from '@dxos/util';

import { type IMetadataStore, hasInvitationExpired } from './metadata-store';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

const EXPIRED_INVITATION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

const emptyEchoMetadata = (): EchoMetadata => ({
  version: STORAGE_VERSION,
  spaces: [],
  created: new Date(),
  updated: new Date(),
});

const emptyLargeSpaceMetadata = (): LargeSpaceMetadata => ({});

const EchoMetadataCodec = schema.getCodecForType('dxos.echo.metadata.EchoMetadata');
const LargeSpaceMetadataCodec = schema.getCodecForType('dxos.echo.metadata.LargeSpaceMetadata');

const MAIN_KEY = 'main';
const largeKey = (spaceKey: PublicKey) => `large:${spaceKey.toHex()}`;

// Legacy invitation type detection.
const isLegacyInvitationFormat = (invitation: Invitation): boolean => invitation.type === Invitation.Type.MULTIUSE;

export type SqliteMetadataStoreProps = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
};

/**
 * SQLite-backed replacement for MetadataStore.
 * Stores EchoMetadata as a single protobuf blob and LargeSpaceMetadata as per-space blobs.
 */
export class SqliteMetadataStore implements IMetadataStore {
  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;

  #metadata: EchoMetadata = emptyEchoMetadata();
  readonly #spaceLargeMetadata = new ComplexMap<PublicKey, LargeSpaceMetadata>(PublicKey.hash);

  readonly update = new Event<EchoMetadata>();
  readonly #invitationCleanupCtx = new Context();

  constructor({ runtime }: SqliteMetadataStoreProps) {
    this.#runtime = runtime;
  }

  /**
   * Creates the space_metadata and space_large tables if they do not exist.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> = Effect.fn(
    'SqliteMetadataStore.migrate',
  )(() =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`CREATE TABLE IF NOT EXISTS space_metadata (
          key TEXT PRIMARY KEY,
          value BLOB NOT NULL
        )`;
      yield* sql`CREATE TABLE IF NOT EXISTS space_large (
          space_key TEXT PRIMARY KEY,
          value BLOB NOT NULL
        )`;
      log('space_metadata and space_large tables ready');
    }).pipe(Effect.withSpan('SqliteMetadataStore.migrate')),
  )();

  get metadata(): EchoMetadata {
    return this.#metadata;
  }

  get version(): number {
    return this.#metadata.version ?? 0;
  }

  get spaces(): SpaceMetadata[] {
    return this.#metadata.spaces ?? [];
  }

  async close(): Promise<void> {
    await this.#invitationCleanupCtx.dispose();
    await this._save();
    this.#metadata = emptyEchoMetadata();
    this.#spaceLargeMetadata.clear();
  }

  /**
   * Loads metadata from SQLite.
   */
  @synchronized
  async load(): Promise<void> {
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ value: Uint8Array }>`SELECT value FROM space_metadata WHERE key = ${MAIN_KEY}`;
      }),
    );

    if (rows.length > 0) {
      try {
        this.#metadata = this.#decodeWithCrc(rows[0].value, EchoMetadataCodec) ?? emptyEchoMetadata();
        this.#metadata.spaces?.forEach((space) => {
          space.state ??= SpaceState.SPACE_ACTIVE;
        });
      } catch (err: any) {
        log.error('failed to load metadata from SQLite', { err });
        this.#metadata = emptyEchoMetadata();
      }
    }

    // Load large metadata for all known spaces.
    const spaceKeys = [
      this.#metadata.identity?.haloSpace.key,
      ...(this.#metadata.spaces?.map((s) => s.key) ?? []),
    ].filter(isNonNullable);

    await forEachAsync(spaceKeys, async (key) => {
      try {
        await this.#loadSpaceLargeMetadata(key);
      } catch (err: any) {
        log.error('failed to load large space metadata', { err });
      }
    });

    scheduleTaskInterval(
      this.#invitationCleanupCtx,
      async () => {
        for (const invitation of this.#metadata.invitations ?? []) {
          if (hasInvitationExpired(invitation) || isLegacyInvitationFormat(invitation)) {
            await this.removeInvitation(invitation.invitationId);
          }
        }
      },
      EXPIRED_INVITATION_CLEANUP_INTERVAL,
    );
  }

  async flush(): Promise<void> {
    // No-op: SQLite writes are immediate.
  }

  hasSpace(spaceKey: PublicKey): boolean {
    if (this.#metadata.identity?.haloSpace.key.equals(spaceKey)) {
      return true;
    }
    return !!this.spaces.find((space) => space.key.equals(spaceKey));
  }

  getIdentityRecord(): IdentityRecord | undefined {
    return this.#metadata.identity;
  }

  async setIdentityRecord(record: IdentityRecord): Promise<void> {
    invariant(!this.#metadata.identity, 'Cannot overwrite existing identity in metadata');
    this.#metadata.identity = record;
    await this._save();
  }

  getInvitations(): Invitation[] {
    return this.#metadata.invitations ?? [];
  }

  async addInvitation(invitation: Invitation): Promise<void> {
    if (this.#metadata.invitations?.find((i) => i.invitationId === invitation.invitationId)) {
      return;
    }
    (this.#metadata.invitations ??= []).push(invitation);
    await this._save();
  }

  async removeInvitation(invitationId: string): Promise<void> {
    this.#metadata.invitations = (this.#metadata.invitations ?? []).filter((i) => i.invitationId !== invitationId);
    await this._save();
  }

  async addSpace(record: SpaceMetadata): Promise<void> {
    invariant(
      !(this.#metadata.spaces ?? []).find((space) => space.key.equals(record.key)),
      'Cannot overwrite existing space in metadata',
    );
    (this.#metadata.spaces ??= []).push(record);
    await this._save();
  }

  async setSpaceDataLatestTimeframe(spaceKey: PublicKey, timeframe: Timeframe): Promise<void> {
    this.#getSpace(spaceKey).dataTimeframe = timeframe;
    await this._save();
  }

  async setSpaceControlLatestTimeframe(spaceKey: PublicKey, timeframe: Timeframe): Promise<void> {
    this.#getSpace(spaceKey).controlTimeframe = timeframe;
    await this._save();
  }

  async setCache(spaceKey: PublicKey, cache: SpaceCache): Promise<void> {
    this.#getSpace(spaceKey).cache = cache;
    await this._save();
  }

  async setWritableFeedKeys(spaceKey: PublicKey, controlFeedKey: PublicKey, dataFeedKey: PublicKey): Promise<void> {
    const space = this.#getSpace(spaceKey);
    space.controlFeedKey = controlFeedKey;
    space.dataFeedKey = dataFeedKey;
    await this._save();
  }

  async setSpaceState(spaceKey: PublicKey, state: SpaceState): Promise<void> {
    this.#getSpace(spaceKey).state = state;
    await this._save();
  }

  getSpaceControlPipelineSnapshot(spaceKey: PublicKey): ControlPipelineSnapshot | undefined {
    return this.#getLargeSpaceMetadata(spaceKey).controlPipelineSnapshot;
  }

  async setSpaceControlPipelineSnapshot(spaceKey: PublicKey, snapshot: ControlPipelineSnapshot): Promise<void> {
    this.#getLargeSpaceMetadata(spaceKey).controlPipelineSnapshot = snapshot;
    await this._saveSpaceLargeMetadata(spaceKey);
  }

  getSpaceEdgeReplicationSetting(spaceKey: PublicKey): EdgeReplicationSetting | undefined {
    return this.hasSpace(spaceKey) ? this.#getSpace(spaceKey).edgeReplication : undefined;
  }

  async setSpaceEdgeReplicationSetting(spaceKey: PublicKey, setting: EdgeReplicationSetting): Promise<void> {
    this.#getSpace(spaceKey).edgeReplication = setting;
    await this._save();
  }

  get deletedSpaces(): PublicKey[] {
    return this.#metadata.deletedSpaces ?? [];
  }

  async addDeletedSpace(spaceKey: PublicKey): Promise<void> {
    if ((this.#metadata.deletedSpaces ?? []).some((key) => key.equals(spaceKey))) {
      return;
    }
    (this.#metadata.deletedSpaces ??= []).push(spaceKey);
    await this._save();
  }

  async clear(): Promise<void> {
    log('clearing all metadata');
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM space_metadata`;
        yield* sql`DELETE FROM space_large`;
      }),
    );
    this.#metadata = emptyEchoMetadata();
    this.#spaceLargeMetadata.clear();
  }

  #getSpace(spaceKey: PublicKey): SpaceMetadata {
    if (this.#metadata.identity?.haloSpace.key.equals(spaceKey)) {
      return this.#metadata.identity.haloSpace;
    }
    const space = this.spaces.find((space) => space.key.equals(spaceKey));
    invariant(space, 'Space not found');
    return space;
  }

  #getLargeSpaceMetadata(key: PublicKey): LargeSpaceMetadata {
    let entry = this.#spaceLargeMetadata.get(key);
    if (!entry) {
      entry = emptyLargeSpaceMetadata();
      this.#spaceLargeMetadata.set(key, entry);
    }
    return entry;
  }

  @synchronized
  private async _save(): Promise<void> {
    const data: EchoMetadata = {
      ...this.#metadata,
      version: STORAGE_VERSION,
      created: this.#metadata.created ?? new Date(),
      updated: new Date(),
    };
    this.update.emit(data);
    const encoded = this.#encodeWithCrc(EchoMetadataCodec, data);
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT OR REPLACE INTO space_metadata (key, value) VALUES (${MAIN_KEY}, ${encoded})`;
      }),
    );
  }

  async #loadSpaceLargeMetadata(key: PublicKey): Promise<void> {
    const keyStr = largeKey(key);
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ value: Uint8Array }>`SELECT value FROM space_large WHERE space_key = ${keyStr}`;
      }),
    );
    if (rows.length > 0) {
      try {
        const meta = this.#decodeWithCrc(rows[0].value, LargeSpaceMetadataCodec);
        if (meta) {
          this.#spaceLargeMetadata.set(key, meta);
        }
      } catch (err: any) {
        log.error('failed to decode large space metadata', { err });
      }
    }
  }

  @synchronized
  private async _saveSpaceLargeMetadata(key: PublicKey): Promise<void> {
    const data = this.#getLargeSpaceMetadata(key);
    const keyStr = largeKey(key);
    const encoded = this.#encodeWithCrc(LargeSpaceMetadataCodec, data);
    await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT OR REPLACE INTO space_large (space_key, value) VALUES (${keyStr}, ${encoded})`;
      }),
    );
  }

  /** Serialize with CRC32 checksum prefix for integrity checking (matches MetadataStore format). */
  #encodeWithCrc<T>(codec: { encode: (v: T) => Uint8Array }, data: T): Buffer {
    const encoded = arrayToBuffer(codec.encode(data));
    const checksum = CRC32.buf(encoded);
    const result = Buffer.alloc(8 + encoded.length);
    result.writeInt32LE(encoded.length, 0);
    result.writeInt32LE(checksum, 4);
    encoded.copy(result, 8);
    return result;
  }

  /** Deserialize with CRC32 integrity check (matches MetadataStore format). */
  #decodeWithCrc<T>(data: Uint8Array, codec: { decode: (v: Uint8Array) => T }): T | undefined {
    const buf = Buffer.from(data);
    if (buf.length < 8) {
      return undefined;
    }
    const dataSize = buf.readInt32LE(0);
    const checksum = buf.readInt32LE(4);
    if (dataSize < 0 || dataSize > buf.length - 8) {
      throw new DataCorruptionError({
        message: 'Metadata size header is invalid.',
        context: { fileLength: buf.length, dataSize },
      });
    }
    if (buf.length !== dataSize + 8) {
      throw new DataCorruptionError({
        message: 'Metadata payload length does not match framing header.',
        context: { fileLength: buf.length, dataSize },
      });
    }
    const payload = buf.subarray(8, dataSize + 8);
    const calculated = CRC32.buf(payload);
    if (calculated !== checksum) {
      throw new DataCorruptionError({ message: 'Metadata checksum is invalid.' });
    }
    return codec.decode(payload);
  }
}

//
// Copyright 2021 DXOS.org
//

import CRC32 from 'crc-32';

import { Event, scheduleTaskInterval, synchronized } from '@dxos/async';
import { type Codec } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataCorruptionError, STORAGE_VERSION } from '@dxos/protocols';
import {
  create,
  encodePublicKey,
  fromBinary,
  timeframeToBuf,
  timestampDate,
  timestampFromDate,
  toBinary,
  toPublicKey,
} from '@dxos/protocols/buf';
import { type Invitation, Invitation_Type, SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  type ControlPipelineSnapshot,
  type EchoMetadata,
  EchoMetadataSchema,
  type EdgeReplicationSetting,
  type IdentityRecord,
  type LargeSpaceMetadata,
  LargeSpaceMetadataSchema,
  type SpaceCache,
  type SpaceMetadata,
} from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { type Directory, type File } from '@dxos/random-access-storage';
import { type Timeframe } from '@dxos/timeframe';
import { ComplexMap, arrayToBuffer, forEachAsync, isNonNullable } from '@dxos/util';

const EXPIRED_INVITATION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export interface AddSpaceOptions {
  key: PublicKey;
  genesisFeed: PublicKey;
}

const emptyEchoMetadata = (): EchoMetadata =>
  create(EchoMetadataSchema, {
    version: STORAGE_VERSION,
    spaces: [],
    created: timestampFromDate(new Date()),
    updated: timestampFromDate(new Date()),
  });

const emptyLargeSpaceMetadata = (): LargeSpaceMetadata => create(LargeSpaceMetadataSchema, {});

const echoMetadataCodec: Codec<EchoMetadata> = {
  encode: (msg: EchoMetadata) => toBinary(EchoMetadataSchema, msg),
  decode: (bytes: Uint8Array) => fromBinary(EchoMetadataSchema, bytes),
};

const largeSpaceMetadataCodec: Codec<LargeSpaceMetadata> = {
  encode: (msg: LargeSpaceMetadata) => toBinary(LargeSpaceMetadataSchema, msg),
  decode: (bytes: Uint8Array) => fromBinary(LargeSpaceMetadataSchema, bytes),
};

export class MetadataStore {
  private _metadata: EchoMetadata = emptyEchoMetadata();
  private _spaceLargeMetadata = new ComplexMap<PublicKey, LargeSpaceMetadata>(PublicKey.hash);

  private _metadataFile?: File = undefined;

  public readonly update = new Event<EchoMetadata>();
  private readonly _invitationCleanupCtx = new Context();

  /**
   * @internal
   */
  readonly _directory: Directory;

  constructor(directory: Directory) {
    this._directory = directory;
  }

  get metadata(): EchoMetadata {
    return this._metadata;
  }

  get version(): number {
    return this._metadata.version ?? 0;
  }

  /**
   * Returns a list of currently saved spaces. The list and objects in it can be modified addSpace and
   * addSpaceFeed functions.
   */
  get spaces(): SpaceMetadata[] {
    return this._metadata.spaces ?? [];
  }

  private async _readFile<T>(file: File, codec: Codec<T>): Promise<T | undefined> {
    try {
      const { size: fileLength } = await file.stat();
      if (fileLength < 8) {
        return;
      }
      // Loading file size from first 4 bytes.
      const dataSize = fromBytesInt32(await file.read(0, 4));
      const checksum = fromBytesInt32(await file.read(4, 4));
      log('loaded', { size: dataSize, checksum, name: file.filename });

      if (fileLength < dataSize + 8) {
        throw new DataCorruptionError({
          message: 'Metadata size is smaller than expected.',
          context: { fileLength, dataSize },
        });
      }

      const data = await file.read(8, dataSize);

      const calculatedChecksum = CRC32.buf(data);
      if (calculatedChecksum !== checksum) {
        throw new DataCorruptionError({ message: 'Metadata checksum is invalid.' });
      }

      return codec.decode(data);
    } finally {
      await file.close();
    }
  }

  /**
   * @internal
   */
  async _writeFile<T>(file: File, codec: Codec<T>, data: T): Promise<void> {
    const encoded = arrayToBuffer(codec.encode(data));
    const checksum = CRC32.buf(encoded);

    const result = Buffer.alloc(8 + encoded.length);

    result.writeInt32LE(encoded.length, 0);
    result.writeInt32LE(checksum, 4);
    encoded.copy(result, 8);

    // NOTE: This must be done in one write operation, otherwise the file can be corrupted.
    await file.write(0, result);

    log('saved', { size: encoded.length, checksum });
  }

  async close(): Promise<void> {
    await this._invitationCleanupCtx.dispose();
    await this.flush();
    await this._metadataFile?.close();
    this._metadataFile = undefined;
    this._metadata = emptyEchoMetadata();
    this._spaceLargeMetadata.clear();
  }

  /**
   * Loads metadata from persistent storage.
   */
  @synchronized
  async load(): Promise<void> {
    if (!this._metadataFile || this._metadataFile.closed) {
      this._metadataFile = this._directory.getOrCreateFile('EchoMetadata');
    }

    try {
      const metadata = await this._readFile(this._metadataFile, echoMetadataCodec);
      if (metadata) {
        this._metadata = metadata;
      }

      // post-processing
      this._metadata.spaces?.forEach((space) => {
        space.state ??= SpaceState.SPACE_ACTIVE;
      });
    } catch (err: any) {
      log.error('failed to load metadata', { err });
      this._metadata = emptyEchoMetadata();
    }

    await forEachAsync(
      [this._metadata.identity?.haloSpace?.key, ...(this._metadata.spaces?.map((space) => space.key) ?? [])]
        .filter(isNonNullable)
        .map(toPublicKey),
      async (key) => {
        try {
          await this._loadSpaceLargeMetadata(key);
        } catch (err: any) {
          log.error('failed to load space large metadata', { err });
        }
      },
    );

    // Cleanup expired persistent invitations.
    scheduleTaskInterval(
      this._invitationCleanupCtx,
      async () => {
        for (const invitation of this._metadata.invitations ?? []) {
          if (hasInvitationExpired(invitation) || isLegacyInvitationFormat(invitation)) {
            await this.removeInvitation(invitation.invitationId);
          }
        }
      },
      EXPIRED_INVITATION_CLEANUP_INTERVAL,
    );
  }

  @synchronized
  private async _save(): Promise<void> {
    const data: EchoMetadata = {
      ...this._metadata,
      version: STORAGE_VERSION,
      created: this._metadata.created ?? timestampFromDate(new Date()),
      updated: timestampFromDate(new Date()),
    };
    this.update.emit(data);

    const file = this._directory.getOrCreateFile('EchoMetadata');

    await this._writeFile(file, echoMetadataCodec, data);
  }

  private async _loadSpaceLargeMetadata(key: PublicKey): Promise<void> {
    const file = this._directory.getOrCreateFile(`space_${key.toHex()}_large`);
    try {
      const metadata = await this._readFile(file, largeSpaceMetadataCodec);
      if (metadata) {
        this._spaceLargeMetadata.set(key, metadata);
      }
    } catch (err: any) {
      log.error('failed to load space large metadata', { err });
    }
  }

  @synchronized
  private async _saveSpaceLargeMetadata(key: PublicKey): Promise<void> {
    const data = this._getLargeSpaceMetadata(key);
    const file = this._directory.getOrCreateFile(`space_${key.toHex()}_large`);
    await this._writeFile(file, largeSpaceMetadataCodec, data);
  }

  async flush(): Promise<void> {
    await this._directory.flush();
  }

  _getSpace(spaceKey: PublicKey): SpaceMetadata {
    if (this._metadata.identity?.haloSpace?.key && toPublicKey(this._metadata.identity.haloSpace.key).equals(spaceKey)) {
      return this._metadata.identity.haloSpace;
    }

    const space = this.spaces.find((space) => space.key && toPublicKey(space.key).equals(spaceKey));
    invariant(space, 'Space not found');
    return space!;
  }

  hasSpace(spaceKey: PublicKey): boolean {
    if (this._metadata.identity?.haloSpace?.key && toPublicKey(this._metadata.identity.haloSpace.key).equals(spaceKey)) {
      return true;
    }

    return !!this.spaces.find((space) => space.key && toPublicKey(space.key).equals(spaceKey));
  }

  private _getLargeSpaceMetadata(key: PublicKey): LargeSpaceMetadata {
    let entry = this._spaceLargeMetadata.get(key);
    if (entry) {
      return entry;
    }

    entry = emptyLargeSpaceMetadata();
    this._spaceLargeMetadata.set(key, entry);
    return entry;
  }

  /**
   * Clears storage - doesn't work for now.
   */
  async clear(): Promise<void> {
    log('clearing all metadata');
    await this._directory.delete();
    this._metadata = emptyEchoMetadata();
  }

  getIdentityRecord(): IdentityRecord | undefined {
    return this._metadata.identity;
  }

  async setIdentityRecord(record: IdentityRecord): Promise<void> {
    invariant(!this._metadata.identity, 'Cannot overwrite existing identity in metadata');

    this._metadata.identity = record;
    await this._save();
    await this.flush();
  }

  getInvitations(): Invitation[] {
    return this._metadata.invitations ?? [];
  }

  async addInvitation(invitation: Invitation): Promise<void> {
    if (this._metadata.invitations?.find((i) => i.invitationId === invitation.invitationId)) {
      return;
    }

    (this._metadata.invitations ??= []).push(invitation);
    await this._save();
    await this.flush();
  }

  async removeInvitation(invitationId: string): Promise<void> {
    this._metadata.invitations = (this._metadata.invitations ?? []).filter((i) => i.invitationId !== invitationId);
    await this._save();
    await this.flush();
  }

  async addSpace(record: SpaceMetadata): Promise<void> {
    invariant(
      !(this._metadata.spaces ?? []).find((space) => space.key && record.key && toPublicKey(space.key).equals(toPublicKey(record.key))),
      'Cannot overwrite existing space in metadata',
    );

    (this._metadata.spaces ??= []).push(record);
    await this._save();
    await this.flush();
  }

  async setSpaceDataLatestTimeframe(spaceKey: PublicKey, timeframe: Timeframe): Promise<void> {
    this._getSpace(spaceKey).dataTimeframe = timeframeToBuf(timeframe);
    await this._save();
  }

  async setSpaceControlLatestTimeframe(spaceKey: PublicKey, timeframe: Timeframe): Promise<void> {
    this._getSpace(spaceKey).controlTimeframe = timeframeToBuf(timeframe);
    await this._save();
    await this.flush();
  }

  async setCache(spaceKey: PublicKey, cache: SpaceCache): Promise<void> {
    this._getSpace(spaceKey).cache = cache;
    await this._save();
  }

  async setWritableFeedKeys(spaceKey: PublicKey, controlFeedKey: PublicKey, dataFeedKey: PublicKey): Promise<void> {
    const space = this._getSpace(spaceKey);
    space.controlFeedKey = encodePublicKey(controlFeedKey);
    space.dataFeedKey = encodePublicKey(dataFeedKey);
    await this._save();
    await this.flush();
  }

  async setSpaceState(spaceKey: PublicKey, state: SpaceState): Promise<void> {
    this._getSpace(spaceKey).state = state;
    await this._save();
    await this.flush();
  }

  getSpaceControlPipelineSnapshot(spaceKey: PublicKey): ControlPipelineSnapshot | undefined {
    return this._getLargeSpaceMetadata(spaceKey).controlPipelineSnapshot;
  }

  async setSpaceControlPipelineSnapshot(spaceKey: PublicKey, snapshot: ControlPipelineSnapshot): Promise<void> {
    this._getLargeSpaceMetadata(spaceKey).controlPipelineSnapshot = snapshot;
    await this._saveSpaceLargeMetadata(spaceKey);
    await this.flush();
  }

  getSpaceEdgeReplicationSetting(spaceKey: PublicKey): EdgeReplicationSetting | undefined {
    return this.hasSpace(spaceKey) ? this._getSpace(spaceKey).edgeReplication : undefined;
  }

  async setSpaceEdgeReplicationSetting(spaceKey: PublicKey, setting: EdgeReplicationSetting): Promise<void> {
    this._getSpace(spaceKey).edgeReplication = setting;
    await this._save();
    await this.flush();
  }
}

const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);

export const hasInvitationExpired = (invitation: Invitation): boolean => {
  return Boolean(
    invitation.created &&
      invitation.lifetime &&
      invitation.lifetime !== 0 &&
      timestampDate(invitation.created).getTime() + invitation.lifetime * 1000 < Date.now(),
  );
};

// TODO: remove once "multiuse" type invitations get removed from local metadata of existing profiles
const isLegacyInvitationFormat = (invitation: Invitation): boolean => {
  return invitation.type === Invitation_Type.MULTIUSE;
};

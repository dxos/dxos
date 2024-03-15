//
// Copyright 2023 DXOS.org
//

import { subtleCrypto } from '@dxos/crypto';
import { schema } from '@dxos/protocols';
import { type StoredSnapshotInfo } from '@dxos/protocols/proto/dxos/devtools/host';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type Directory } from '@dxos/random-access-storage';

const SpaceSnapshot = schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot');
/**
 * @deprecated
 */
export class SnapshotStore {
  constructor(private readonly _directory: Directory) {}

  async saveSnapshot(snapshot: SpaceSnapshot): Promise<string> {
    const encoded = SpaceSnapshot.encode(snapshot);
    const key = await subtleCrypto.digest('SHA-256', encoded);
    const keyString = Buffer.from(key).toString('hex');

    const file = await this._directory.getOrCreateFile(keyString);
    try {
      await file.write(0, Buffer.from(encoded));
    } finally {
      await file.close();
    }

    return keyString;
  }

  async loadSnapshot(key: string): Promise<SpaceSnapshot | undefined> {
    const file = await this._directory.getOrCreateFile(key);
    try {
      const { size } = await file.stat();
      if (size === 0) {
        return undefined;
      }

      const buffer = await file.read(0, size);
      return SpaceSnapshot.decode(buffer);
    } finally {
      await file.close();
    }
  }

  async listSnapshots(): Promise<StoredSnapshotInfo[]> {
    const entries = await this._directory.list();

    return await Promise.all(
      entries.map(async (key) => {
        const { size } = await this._directory.getOrCreateFile(key).stat();
        return {
          key,
          size,
        };
      }),
    );
  }
}

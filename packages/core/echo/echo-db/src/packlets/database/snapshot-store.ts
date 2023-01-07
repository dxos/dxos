//
// Copyright 2023 DXOS.org
//

import { subtleCrypto } from '@dxos/crypto';
import { schema } from '@dxos/protocols';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { Directory } from '@dxos/random-access-storage';

export class SnapshotStore {
  // prettier-ignore
  constructor(
    private readonly _directory: Directory
  ) {}

  async saveSnapshot(snapshot: SpaceSnapshot): Promise<string> {
    const encoded = schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').encode(snapshot);
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
      return schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').decode(buffer);
    } finally {
      await file.close();
    }
  }
}

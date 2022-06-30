//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { keyToString } from '@dxos/crypto';
import { schema, PartyKey, PartySnapshot } from '@dxos/echo-protocol';
import { Directory } from '@dxos/random-access-multi-storage';

/**
 * Stores party snapshots. Takes any `random-access-storage` compatible backend.
 *
 * Passing `ram` as a backend will make all of files temporary, effectively disabling snapshots.
 */
export class SnapshotStore {
  constructor (
    private readonly _directory: Directory
  ) {}

  async load (partyKey: PartyKey): Promise<PartySnapshot | undefined> {
    const file = this._directory.createOrOpen(partyKey.toHex());

    try {
      const { size } = await file.stat();
      if (size === 0) {
        return undefined;
      }

      const data = await file.read(0, size);
      return schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').decode(data);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return undefined;
      } else {
        throw err;
      }
    } finally {
      await file.close();
    }
  }

  async save (snapshot: PartySnapshot) {
    assert(snapshot.partyKey);
    const file = this._directory.createOrOpen(keyToString(snapshot.partyKey), { truncate: true, size: 0 });

    try {
      const data = schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').encode(snapshot);
      await file.write(0, Buffer.from(data));
    } finally {
      await file.close();
    }
  }

  /**
   * Removes all data.
   * TODO(mykola): does nothing;
   */
  async clear () {}
}

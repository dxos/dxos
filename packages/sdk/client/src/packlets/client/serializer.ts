//
// Copyright 2022 DXOS.org
//

import { schema } from '@dxos/protocols';

import { Space } from '../proxies';
import { Client } from './client';

const spaceCodec = schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot');

/**
 * Import/export space.
 * @deprecated
 */
export class SpaceSerializer {
  // prettier-ignore
  constructor(
    private readonly _client: Client
  ) {}

  async serializeSpace(space: Space) {
    const snapshot = await space.createSnapshot();
    return new Blob([spaceCodec.encode(snapshot)]);
  }

  async deserializeSpace(data: Uint8Array) {
    return await this._client.echo.cloneSpace(spaceCodec.decode(data));
  }
}

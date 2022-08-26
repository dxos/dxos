//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { encode } from './pipeline';
import { Space } from './space';

const createCredential = (type: string, data: any = undefined) => {
  return {
    type,
    data
  };
};

export class Device {
  readonly key = PublicKey.random();
  constructor (
    readonly writableFeedKey?: PublicKey
  ) {}
}

export class HALO {
  private _space?: Space;

  // TODO(burdon): Device manager.
  private _devices: Buffer[] = [];

  async genesis () {
    const space = new Space();

    const spaceKey = PublicKey.random();
    space.pipeline.writableFeed!.append(encode(createCredential('genesis', { key: spaceKey.toHex() })));

    const identityKey = PublicKey.random();
    space.pipeline.writableFeed!.append(encode(createCredential('identity', { key: identityKey.toHex() })));

    // TODO(burdon): How do these get processed in the SAME way as other devices joining the party?
    await this.authDevice(new Device(space.pipeline.writableFeed?.key));

    this._space = space;
    return space;
  }

  get initialized () {
    return !!this._space;
  }

  getDevices () {
    return this._devices;
  }

  // TODO(burdon): Challenge!
  async authDevice (device: Device) {
    const space = this._space!;

    space.pipeline.writableFeed!.append(encode(createCredential('device', { key: device.key.toHex() })));
    if (device.writableFeedKey) {
      space.pipeline.writableFeed!.append(encode(createCredential('feed', { key: device.writableFeedKey.toHex() })));
    }
  }
}

//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { PublicKey } from '@dxos/protocols';

import { decode, encode } from './pipeline';
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
  private _running = false;

  // TODO(burdon): Device manager.
  private _devices: Buffer[] = [];

  async init () {
    this._space = new Space();

    // TODO(burdon): Stopping.
    setImmediate(async () => {
      assert(this._space);
      const iterator = this._space.pipeline.messageIterator;
      for await (const [message, feedKey, i] of iterator.reader()) {
        // TODO(burdon): Add writable feed to feedstore.
        console.log('::::', decode(message));
      }
    });
  }

  // TODO(burdon): Kill above.
  async stop () {
    this._running = false;
  }

  async genesis () {
    assert(this._space);

    const spaceKey = PublicKey.random();
    this._space.pipeline.writableFeed!.append(encode(createCredential('genesis', { key: spaceKey.toHex() })));

    const identityKey = PublicKey.random();
    this._space.pipeline.writableFeed!.append(encode(createCredential('identity', { key: identityKey.toHex() })));

    // TODO(burdon): How do these get processed in the SAME way as other devices joining the party?
    await this.authDevice(new Device(this._space.pipeline.writableFeed?.key));
  }

  get initialized () {
    return !!this._space;
  }

  getDevices () {
    return this._devices;
  }

  async authDevice (device: Device) {
    assert(this._space);

    this._space.pipeline.writableFeed!.append(encode(createCredential('device', { key: device.key.toHex() })));
    if (device.writableFeedKey) {
      this._space.pipeline.writableFeed!.append(encode(createCredential('feed', { key: device.writableFeedKey.toHex() })));
    }
  }
}

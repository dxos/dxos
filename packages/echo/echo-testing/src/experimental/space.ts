//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

import { Pipeline } from './pipeline';

export class Space {
  readonly key = PublicKey.random();
  readonly pipeline = new Pipeline();
}

export class HALO {
  private _space?: Space;

  // TODO(burdon): Device manager.
  private _devices: Buffer[] = [];

  async genesis () {
    // TODO(burdon): Create identity key, space key, device key, feed key.
    const space = new Space();

    // TODO(burdon): Write credentials from new package.
    space.pipeline.writableFeed.append(Buffer.from('space-genesis'));
    space.pipeline.writableFeed.append(Buffer.from('identity')); // TODO(burdon): Identity abstraction?

    // TODO(burdon): How do these get processed in the SAME way as other devices joining the party?
    space.pipeline.writableFeed.append(Buffer.from('device'));
    space.pipeline.writableFeed.append(Buffer.from('feed'));

    this._space = space;
    return space;
  }

  getDevices () {
    return this._devices;
  }

  // TODO(burdon): Challenge!
  async addDevice (deviceKey: PublicKey) {
    throw new Error('Not implemented');
  }

  get initialized () {
    return !!this._space;
  }
}

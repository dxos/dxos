//
// Copyright 2020 DXOS.org
//

import { faker } from '@dxos/random';

// God's eye view.

// TODO(burdon): DXN for ID.
type Key = string;
type Timeframe = string;

/**
 * KUBE node.
 */
export type Kube = {
  id: Key;
  bots: Bot[];
};

/**
 * Bot instance (peer of space).
 */
export type Bot = {
  id: Key;
  identity?: Key;
  peerId?: Key;
  spaceKey?: Key;
  timeframe?: Timeframe;
};

/**
 * Connected set of peers.
 */
export type Swarm = {
  discoveryKey: Key;
  peers: Key[];
};

/**
 *
 */
export class Generator {
  private _kubes: Kube[] = [];

  get kubes() {
    return this._kubes;
  }

  mutate() {
    // Remove.
    this._kubes = this._kubes.map((kube) => (faker.number.int(10) > 7 ? kube : undefined)).filter(Boolean);

    // Create.
    if (faker.number.float() > 0.3) {
      this._kubes.push(this.createKube());
    }

    // Add/remove bots.
    this._kubes.forEach((kube) => {
      if (faker.number.int(10) > 3) {
        kube.bots = [
          ...kube.bots.map((bot) => (faker.number.int(10) > 3 ? bot : undefined)).filter(Boolean),
          ...(faker.number.int(10) > 3 ? [this.createBot()] : []),
        ];
      }
    });

    return this;
  }

  addKubes({ min = 1, max = 5 }) {
    this._kubes = [
      ...this._kubes,
      ...Array.from({ length: faker.number.int({ min: 0, max: 5 }) }).map(() => this.createKube()),
    ];

    return this;
  }

  createKube(): Kube {
    return {
      id: faker.string.uuid(),
      bots: Array.from({
        length: faker.number.int({ min: 0, max: 5 }),
      }).map(() => this.createBot()),
    };
  }

  createBot(): Bot {
    return {
      id: faker.string.uuid(),
    };
  }
}

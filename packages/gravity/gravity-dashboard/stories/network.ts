//
// Copyright 2020 DXOS.org
//

import faker from 'faker';

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
 * Bot instance (peer of party).
 */
export type Bot = {
  id: Key;
  identity?: Key;
  peerId?: Key;
  partyKey?: Key;
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
    this._kubes = this._kubes
      .map((kube) => (faker.datatype.number(10) > 7 ? kube : undefined))
      .filter(Boolean);

    // Create.
    if (faker.datatype.float() > 0.3) {
      this._kubes.push(this.createKube());
    }

    // Add/remove bots.
    this._kubes.forEach((kube) => {
      if (faker.datatype.number(10) > 3) {
        kube.bots = [
          ...kube.bots
            .map((bot) => (faker.datatype.number(10) > 3 ? bot : undefined))
            .filter(Boolean),
          ...(faker.datatype.number(10) > 3 ? [this.createBot()] : [])
        ];
      }
    });

    return this;
  }

  addKubes({ min = 1, max = 5 }) {
    this._kubes = [
      ...this._kubes,
      ...Array.from({ length: faker.datatype.number({ min: 0, max: 5 }) }).map(
        () => this.createKube()
      )
    ];

    return this;
  }

  createKube(): Kube {
    return {
      id: faker.datatype.uuid(),
      bots: Array.from({
        length: faker.datatype.number({ min: 0, max: 5 })
      }).map(() => this.createBot())
    };
  }

  createBot(): Bot {
    return {
      id: faker.datatype.uuid()
    };
  }
}

//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { PublicKey } from '@dxos/protocols';

import { HALO } from './space';

const log = debug('dxos:test:halo');

faker.seed(100);

describe('HALO', () => {
  // Phase 2: Pipeline Abstraction
  // TODO(burdon): Auth state machine.
  // TODO(burdon): Genesis (incl. device joining).
  // TODO(burdon): Invitations and device joining (credential state machine).
  // TODO(burdon): Cold start (same outcomde).

  test('Genesis', async () => {
    const halo = new HALO();
    await halo.genesis();

    // TODO(burdon): Wait for first device to show up.
    log(halo);
    expect(halo.initialized).toBeTruthy();

    // TODO(burdon): Write credential to invite new device.
    const device = {
      key: PublicKey.random()
    };

    await halo.addDevice(device.key);
    expect(halo.getDevices()).toHaveLength(1);
  });

  // Phase 3
  // TODO(burdon): Space items.
  // TODO(burdon): Invitations and member joining.

  // Phase 4
  // TODO(burdon): Strongly typed items.
  // TODO(burdon): Epochs.
  // TODO(burdon): Bots.
});

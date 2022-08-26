//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import expect from 'expect';
import faker from 'faker';
import { it as test } from 'mocha';

import { HALO } from './halo';

const log = debug('dxos:test:halo');

faker.seed(100);

describe('HALO', () => {
  // Phase 2: Pipeline Abstraction
  // TODO(burdon): Auth state machine.
  // TODO(burdon): Genesis (incl. device joining).
  // TODO(burdon): Invitations and device joining (credential state machine).
  // TODO(burdon): Cold start (same outcomde).

  test('Genesis', async () => {
    // TODO(dmaretskyi): What do you think about API similar to:
    /*
    const dxos = new DXOS();
    const [profile] = await dxos.loadProfiles();

    const space = await profile.createSpace(TaskListSchema);

    space.data.taskList.push(new Task({ title: 'Buy eggs' }))
   */

    const halo = new HALO();
    await halo.init();
    await halo.genesis();

    // TODO(burdon): Wait for first device to show up.
    log(halo);
    expect(halo.initialized).toBeTruthy();
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

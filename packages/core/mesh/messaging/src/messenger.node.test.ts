//
// Copyright 2022 DXOS.org
//

import { beforeEach, describe } from 'vitest';

import { messengerTests } from './messenger.blueprint-test';
import { MemorySignalManager, MemorySignalManagerContext } from './signal-manager';

// TODO(mykola): Use EDGE signal server.
describe('Messenger with MemorySignalManager', () => {
  let context: MemorySignalManagerContext;
  beforeEach(async () => {
    context = new MemorySignalManagerContext();
  });

  messengerTests(async () => new MemorySignalManager(context));
});

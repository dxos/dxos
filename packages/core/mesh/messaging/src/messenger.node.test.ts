//
// Copyright 2022 DXOS.org
//

import { beforeEach, describe } from 'vitest';

import { messengerTests } from './messenger.blueprint-test.ts';
import { MemorySignalManager, MemorySignalManagerContext } from './signal-manager/index.ts';

// TODO(mykola): Use EDGE signal server.
describe('Messenger with MemorySignalManager', () => {
  let context: MemorySignalManagerContext;
  beforeEach(async () => {
    context = new MemorySignalManagerContext();
  });

  messengerTests(async () => new MemorySignalManager(context));
});

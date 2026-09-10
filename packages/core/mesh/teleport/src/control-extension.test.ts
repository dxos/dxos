//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { ControlExtension } from './control-extension';

describe('ControlExtension', () => {
  // Teleport aborts every registered extension, including one whose `onOpen` has not completed.
  test('onAbort before onOpen does not throw', async () => {
    await createExtension().onAbort();
  });

  test('onClose before onOpen does not throw', async () => {
    await createExtension().onClose();
  });

  test('registerExtension before onOpen throws a descriptive error', async () => {
    await expect(createExtension().registerExtension('test')).rejects.toThrow(/not open/);
  });
});

const createExtension = () =>
  new ControlExtension(
    { heartbeatInterval: 10_000, heartbeatTimeout: 60_000, onTimeout: () => {} },
    PublicKey.random(),
    PublicKey.random(),
  );

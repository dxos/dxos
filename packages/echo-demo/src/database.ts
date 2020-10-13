//
// Copyright 2020 DXOS.org
//

import { KeyType } from '@dxos/credentials';
import { createTestInstance } from '@dxos/echo-db';

export const createECHO = async (options = {}) => {
  const { echo, identityManager, partyManager } = await createTestInstance(options);

  await identityManager.keyring.load();
  await partyManager.open();

  if (!identityManager.identityKey) {
    await identityManager.keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await partyManager.createHalo();
  }

  return { echo, keyring: identityManager.keyring };
};

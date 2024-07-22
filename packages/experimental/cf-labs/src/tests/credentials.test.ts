import { test } from 'vitest';

import { Keyring } from '@dxos/keyring';

test('keyring', async () => {
  const keyring = new Keyring();

  const key = await keyring.createKey();
});

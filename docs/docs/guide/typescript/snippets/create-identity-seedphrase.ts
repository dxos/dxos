//
// Copyright 2022 DXOS.org
//

import { Client, generateSeedPhrase } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const seedphrase = generateSeedPhrase();
  const identity = await client.halo.createProfile({
    seedphrase
  });
  console.log(`Don't lose this recovery key: ${seedphrase}`);
})();

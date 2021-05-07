//
// Copyright 2020 DXOS.org
//

import { existsSync } from 'fs-extra';

import { Config } from '@dxos/config';
import { createId } from '@dxos/crypto';

import { SourceManager } from './source-manager';

// This tests stops working after the hash gets removed from IPFS.
// We need to first upload the file to make it work.
test.skip('Download & install bot', async () => {
  const sourceManager = new SourceManager(new Config({
    localDev: false,
    services: {
      ipfs: {
        gateway: 'https://apollo1.kube.moon.dxos.network/dxos/ipfs/gateway/'
      }
    }
  }));

  const installDirectory = await sourceManager.downloadAndInstallBot(createId(), 'QmPTxbghFFjz59NyXMJwYCAAbhK4etNagybWUKJGaEFU5F', {});

  expect(existsSync(installDirectory)).toBe(true);
}, 20_000);

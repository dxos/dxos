//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { existsSync } from 'fs-extra';
import { it as test } from 'mocha';

import { Config } from '@dxos/config';
import { createId } from '@dxos/crypto';

import { SourceManager } from './source-manager';

// This tests stops working after the hash gets removed from IPFS.
// We need to first upload the file to make it work.
// TODO(marik-d): Do we need this test?
test.skip('Download & install bot', async () => {
  const sourceManager = new SourceManager(new Config({
    localDev: false,
    services: {
      ipfs: {
        gateway: 'https://apollo3.kube.moon.dxos.network/dxos/ipfs/gateway/'
      }
    }
  }));

  const installDirectory = await sourceManager.downloadAndInstallBot(createId(), 'QmPTxbghFFjz59NyXMJwYCAAbhK4etNagybWUKJGaEFU5F', {});

  expect(existsSync(installDirectory)).toBe(true);
}).timeout(20_000);

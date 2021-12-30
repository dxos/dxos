//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import fs from 'fs';
import path from 'path';

import { PublicKey } from '@dxos/crypto';

import { setupIPFSWithBot } from '../testutils';
import { DXNSContentLoader } from './content-loader';

const outDir = './out';

describe('Content loader', () => {
  it('Loads file using dxns', async () => {

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
    }

    const ipfsFilePath = path.join(outDir, PublicKey.random().toString());
    const localDir = path.join(outDir, PublicKey.random().toString());
    await fs.promises.appendFile(ipfsFilePath, PublicKey.random().toString());
    const { ipfsServer, registry, botDXN } = await setupIPFSWithBot(ipfsFilePath);

    const loader = new DXNSContentLoader(registry, ipfsServer.endpoint);

    const downloadedFile = await loader.download({ dxn: botDXN }, localDir);

    const downloadedContent = fs.readFileSync(downloadedFile);
    const originalContent = fs.readFileSync(ipfsFilePath);
    expect(downloadedContent.equals(originalContent)).toBe(true);

    await ipfsServer.stop();
  });
});

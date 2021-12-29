//
// Copyright 2021 DXOS.org
//

import fs from 'fs';
import expect from 'expect';
import path from 'path';

import { randomInt } from "@dxos/util";

import { createMockRegistryWithBots, IPFS, MOCK_BOT_DXN, MOCK_BOT_HASH } from "../testutils";
import { DXNSContentLoader } from "./content-loader";
import { PublicKey } from '@dxos/crypto';

const outDir = './out';

describe.only('Content loader', () => {
  it('Loads file using dxns', async () => {
    const mockRegistry = createMockRegistryWithBots();
    const port = randomInt(40000, 10000);

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
    }

    const ipfsFilePath = path.join(outDir, PublicKey.random().toString());
    const localDir = path.join(outDir, PublicKey.random().toString());
    await fs.promises.appendFile(ipfsFilePath, PublicKey.random().toString());
    const ipfsServer = new IPFS(port, { [MOCK_BOT_HASH]: ipfsFilePath });
    await ipfsServer.start();
    const loader = new DXNSContentLoader(mockRegistry, `http://localhost:${port}`);

    const downloadedFile = await loader.download({ dxn: MOCK_BOT_DXN }, localDir);

    const downloadedContent = fs.readFileSync(downloadedFile);
    const originalContent = fs.readFileSync(ipfsFilePath);
    expect(downloadedContent.equals(originalContent)).toBe(true);

    await ipfsServer.stop();
  });
});

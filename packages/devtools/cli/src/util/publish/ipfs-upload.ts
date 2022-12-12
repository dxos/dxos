//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import { CID, create, globSource } from 'ipfs-http-client';
import assert from 'node:assert';

import { Config } from '@dxos/client';

interface UploadOptions {
  timeout: string | number;
  progress?: (bytes: number, path?: string) => void;
  pin?: boolean;
}

export const uploadToIPFS = async (path: string, config?: Config, options?: UploadOptions): Promise<CID> => {
  const { timeout, pin = true, progress } = options || {};

  const ipfsServer = config?.get('runtime.services.ipfs.server');
  assert(ipfsServer, 'Invalid IPFS Server.');

  const ipfsClient = create({
    url: ipfsServer,
    timeout: timeout || '1m'
  });

  if (!fs.existsSync(path)) {
    throw new Error('Incorrect path to definitons. File or directory does not exist');
  }
  if (fs.lstatSync(path).isDirectory()) {
    const files = [];
    for await (const file of ipfsClient.addAll(globSource(path, '**/*'), {
      progress,
      pin,
      wrapWithDirectory: true
    })) {
      files.push(file);
    }
    return files[files.length - 1].cid;
  } else {
    const content = fs.readFileSync(path);
    const addResult = await ipfsClient.add(content, { pin });
    return addResult.cid;
  }
};

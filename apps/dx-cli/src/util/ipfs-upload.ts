//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import fs from 'fs';
import { create, globSource } from 'ipfs-http-client';

import { ConfigObject } from '@dxos/config';

interface UploadOptions {
  timeout: string | number
  progress?: (bytes: number, path?: string) => void
  pin?: boolean
}

export const uploadToIPFS = async (path: string, config?: ConfigObject, options?: UploadOptions): Promise<string> => {
  const { timeout, pin = true, progress } = options || {};

  const ipfsServer = config?.runtime?.services?.ipfs?.server;
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
    for await (const file of ipfsClient.addAll(globSource(path, '**/*'), { progress, pin, wrapWithDirectory: true })) {
      files.push(file);
    }
    return files[files.length - 1].cid.toString();
  } else {
    const content = fs.readFileSync(path);
    const addResult = await ipfsClient.add(content, { pin });
    return addResult.cid.toString();
  }
};

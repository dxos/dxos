//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import { type CID } from 'kubo-rpc-client';
import { join } from 'path';

import { log } from '@dxos/log';

interface UploadOptions {
  timeout: string | number;
  progress?: (bytes: number, path?: string) => void;
  pin?: boolean;
}

export const uploadToIPFS = async (path: string, ipfsServer: string, options?: UploadOptions): Promise<CID> => {
  const { timeout, pin = true, progress } = options || {};

  const { create, globSource } = await _importESM('kubo-rpc-client');
  const ipfsClient = create({
    url: ipfsServer,
    timeout: timeout || '1m',
  });

  if (!fs.existsSync(path)) {
    throw new Error('Incorrect path to definitons. File or directory does not exist');
  }
  if (fs.lstatSync(path).isDirectory()) {
    const files = [];
    for await (const file of ipfsClient.addAll(globSource(path, '**/*'), {
      progress,
      pin,
      wrapWithDirectory: true,
    })) {
      const fullPath = join(path, file.path);

      if (!fs.lstatSync(fullPath).isDirectory()) {
        const remoteChunks = [];
        for await (const chunk of ipfsClient.cat(file.cid)) {
          remoteChunks.push(chunk);
        }
        const remoteContent = Buffer.concat(remoteChunks);

        const localContent = fs.readFileSync(fullPath);

        if (!localContent.equals(remoteContent)) {
          log.error('file content mismatch', {
            path: fullPath,
            cid: file.cid.toString(),
            localSize: localContent.length,
            remoteSize: remoteContent.length,
          });
        }
      }

      files.push(file);
    }
    return files[files.length - 1].cid; // last file is the root directory
  } else {
    const content = fs.readFileSync(path);
    const addResult = await ipfsClient.add(content, { pin });
    return addResult.cid;
  }
};

// eslint-disable-next-line no-new-func
const _importESM = new Function('modulePath', 'return import(modulePath)');

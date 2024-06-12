//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import { type CID, type KuboRPCClient } from 'kubo-rpc-client';
import { join } from 'path';

import { importESM } from '@dxos/cli-base';

interface UploadOptions {
  progress?: (bytes: number, path?: string) => void;
  pin?: boolean;
}

// TODO(burdon): Generalize.
export const uploadToIPFS = async (ipfsClient: KuboRPCClient, path: string, options?: UploadOptions): Promise<CID> => {
  const { globSource } = await importESM('kubo-rpc-client');
  if (!fs.existsSync(path)) {
    throw new Error(`File or directory does not exist: ${path}}`);
  }

  const { pin = true, progress } = options || {};
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
          throw new Error('file content mismatch', {
            cause: {
              path: fullPath,
              cid: file.cid.toString(),
              localSize: localContent.length,
              remoteSize: remoteContent.length,
            },
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

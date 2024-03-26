//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import cliProgress from 'cli-progress';
import fs from 'fs';
import folderSize from 'get-folder-size';
import { type CID } from 'kubo-rpc-client';
import { join } from 'path';
import { promisify } from 'util';

import type { Config } from '@dxos/client';
import { invariant } from '@dxos/invariant';

import { type Logger, type PackageModule } from './common';
import { uploadToIPFS } from './ipfs-upload';

const DEFAULT_OUTDIR = 'out';

const getFolderSize = promisify(folderSize);

/**
 * Encodes DXN string to fs path.
 *
 * Example: `example:app/braneframe` => `example/app/braneframe`
 */
const encodeName = (name: string) => name.replaceAll(':', '/');

export interface PublishParams {
  config?: Config;
  log: Logger;
  module: PackageModule;
}

interface PublishArgs {
  verbose?: boolean;
  pin?: boolean;
  timeout?: string | number;
  path?: string;
  config?: string;
}

export const publish = async (
  { verbose, timeout, path, pin }: PublishArgs,
  { log, config, module }: PublishParams,
): Promise<CID> => {
  invariant(module.name, 'Module name is required to publish.');
  log(`Publishing module ${chalk.bold(module.name)} ...`);
  const moduleOut = `out/${encodeName(module.name)}`;
  const outdir = path ?? module.build?.outdir ?? (fs.existsSync(moduleOut) ? moduleOut : DEFAULT_OUTDIR);
  const publishFolder = join(process.cwd(), outdir);
  if (!fs.existsSync(publishFolder)) {
    throw new Error(`Publish failed. Build output folder does not exist: ${publishFolder}.`);
  }

  const ipfsServer = config?.get('runtime.services.ipfs.server');
  invariant(ipfsServer, 'Missing IPFS Server.');

  const total = await getFolderSize(publishFolder);
  if (verbose) {
    log(`Publishing from: ${publishFolder} to: ${ipfsServer}`);
  }

  let authorizationHeader;
  // TODO(nf): make CLI support dx-env.yml
  const serverAuthSecret = process.env.IPFS_API_SECRET ?? config?.get('runtime.services.ipfs.serverAuthSecret');
  if (serverAuthSecret) {
    const splitSecret = serverAuthSecret.split(':');
    switch (splitSecret[0]) {
      case 'basic':
        authorizationHeader = 'Basic ' + Buffer.from(splitSecret[1] + ':' + splitSecret[2]).toString('base64');
        break;
      case 'bearer':
        authorizationHeader = 'Bearer ' + splitSecret[1];
        break;
      default:
        throw new Error(`Unsupported authType: ${splitSecret[0]}`);
    }
    log(`using server authorization ${splitSecret[0]}`);
  }

  log('Uploading...');
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  verbose && bar.start(total, 0);

  let cid;
  try {
    cid = await uploadToIPFS(publishFolder, ipfsServer, {
      timeout: timeout || '10m',
      pin,
      progress: verbose ? (bytes: any) => bar.update(bytes) : undefined,
      ...(authorizationHeader ? { authorizationHeader } : {}),
    });
  } catch (err: any) {
    // Avoid leaving user's terminal in a bad state.
    bar.stop();
    throw new Error(`Publish failed. ${err.message}` + (err.cause ? ` (${err.cause})` : ''));
  }

  verbose && bar.update(total);
  verbose && bar.stop();

  log(`Published module ${chalk.bold(module.name)}. IPFS cid: ${cid.toString()}`);
  return cid;
};

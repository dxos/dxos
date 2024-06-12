//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import cliProgress from 'cli-progress';
import fs from 'fs';
import folderSize from 'get-folder-size';
import { join } from 'path';
import { promisify } from 'util';

import { createIpfsClient } from '@dxos/cli-base';
import type { Config } from '@dxos/client';
import { invariant } from '@dxos/invariant';

import { type Logger, type PackageModule } from './common';
import { uploadToIPFS } from './ipfs-upload';

const DEFAULT_OUTDIR = 'out';

const getFolderSize = promisify(folderSize);

/**
 * Encodes DXN string to fs path.
 * Example: `example:app/braneframe` => `example/app/braneframe`
 */
const encodeName = (name: string) => name.replaceAll(':', '/');

interface PublishOptions {
  config: Config;
  log: Logger;
  module: PackageModule;
  verbose?: boolean;
  timeout?: string | number;
  path?: string;
  pin?: boolean;
}

export const publish = async ({ verbose, timeout, path, pin, log, config, module }: PublishOptions): Promise<any> => {
  invariant(module.name, 'Module name is required to publish.');
  log(`Publishing module ${chalk.bold(module.name)} ...`);
  const moduleOut = `out/${encodeName(module.name)}`;
  const outdir = path ?? module.build?.outdir ?? (fs.existsSync(moduleOut) ? moduleOut : DEFAULT_OUTDIR);
  const publishFolder = join(process.cwd(), outdir);
  if (!fs.existsSync(publishFolder)) {
    throw new Error(`Publish failed. Build output folder does not exist: ${publishFolder}.`);
  }

  const total = await getFolderSize(publishFolder);
  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  verbose && progress.start(total, 0);

  let cid;
  try {
    const ipfsClient = await createIpfsClient(config!, timeout);
    log('Uploading...', { folder: publishFolder, server: ipfsClient.getEndpointConfig().host });
    cid = await uploadToIPFS(ipfsClient, publishFolder, {
      progress: verbose ? (bytes: any) => progress.update(bytes) : undefined,
      pin,
    });
  } catch (err: any) {
    // Avoid leaving user's terminal in a bad state.
    progress.stop();
    throw new Error(`Publish failed. ${err.message}` + (err.cause ? ` (${err.cause})` : ''));
  }

  verbose && progress.update(total);
  verbose && progress.stop();

  log(`Published module ${chalk.bold(module.name)}. IPFS cid: ${cid.toString()}`);
  return cid;
};

//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import cliProgress from 'cli-progress';
import fs from 'fs';
import folderSize from 'get-folder-size';
import { join } from 'path';
import { promisify } from 'util';

import type { ConfigObject } from '@dxos/config';
import { log } from '@dxos/debug';

import { uploadToIPFS } from '../ipfs-upload';
import { PackageModule } from './common';

const DEFAULT_OUTDIR = 'out';

const getFolderSize = promisify(folderSize);

/**
 * Encodes DXN string to fs path.
 *
 * Example: `example:app/braneframe` => `example/app/braneframe`
 */
const encodeName = (name: string) => name.replaceAll(':', '/');

export interface PublishParams {
  config?: ConfigObject
  module: PackageModule
}

interface PublishArgs {
  verbose?: boolean
  pin?: boolean
  timeout?: string | number
  path?: string
  config?: string
}

export const publish = async ({ verbose, timeout, path, pin }: PublishArgs, { config, module }: PublishParams) => {
  assert(module.name, 'Module name is required to publish.');
  verbose && log(`Publishing ${module.name}...`);

  const moduleOut = `out/${encodeName(module.name)}`;
  const outdir = path ?? module.build?.outdir ?? (fs.existsSync(moduleOut) ? moduleOut : DEFAULT_OUTDIR);
  const publishFolder = join(process.cwd(), outdir);
  const total = await getFolderSize(publishFolder);

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  verbose && bar.start(total, 0);

  const cid = await uploadToIPFS(publishFolder, config, {
    timeout: timeout || '10m',
    pin,
    progress: verbose ? (bytes: any) => bar.update(bytes) : undefined
  });

  verbose && bar.update(total);
  verbose && bar.stop();

  verbose && log(`Published ${module.name} to IPFS with cid ${cid.toString()}`);

  return cid;
};

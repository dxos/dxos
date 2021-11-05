//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import download from 'download';
import fs from 'fs-extra';
import path from 'path';
import url from 'url';

import { SpawnOptions } from '@dxos/protocol-plugin-bot-deprecated';

import { log } from './log';

// Directory inside `cwd` in which bot packages are downloaded and extracted.
export const BOT_PACKAGE_DOWNLOAD_DIR = 'out/bots';

// Directory inside BOT_PACKAGE_DOWNLOAD_DIR/<CID> in which bots are spawned, in their own UUID named subdirectory.
export const SPAWNED_BOTS_DIR = '.bots';

// File inside local bot folder to run.
export const LOCAL_BOT_MAIN_FILE = 'src/main.js';

const DOWNLOAD_TIMEOUT = 40000;

export class SourceManager {
  private readonly _config: any;
  private readonly _localDev: any;

  constructor (config: any) {
    this._config = config;

    this._localDev = this._config.get('bot.localDev');
  }

  /**
   * Get the install directory and executable file paths for the bot.
   * Downloads the bot to the expected path/directory if required.
   *
   * @returns Install directory.
   */
  async downloadAndInstallBot (id: string, ipfsCID: string | undefined, options: SpawnOptions): Promise<string> {
    // Local bot development mode, bypasses WNS/IPFS.
    if (this._localDev) {
      return process.cwd();
    }

    const installDirectory = path.join(process.cwd(), BOT_PACKAGE_DOWNLOAD_DIR, id);
    if (!fs.existsSync(installDirectory)) {
      assert(ipfsCID);
      await this._downloadBot(installDirectory, ipfsCID, options);
    }

    return installDirectory;
  }

  /**
   * Download the bot package from IPFS.
   */
  async _downloadBot (baseDirectory: string, ipfsCID: string, { ipfsEndpoint }: SpawnOptions) {
    assert(baseDirectory);
    assert(ipfsCID);

    if (!ipfsEndpoint) {
      ipfsEndpoint = this._config.get('services.ipfs.gateway');
    }
    assert(ipfsEndpoint, 'Invalid IPFS Gateway.');

    if (!ipfsEndpoint.endsWith('/')) {
      ipfsEndpoint = `${ipfsEndpoint}/`;
    }
    // eslint-disable-next-line node/no-deprecated-api
    const botPackageUrl = url.resolve(ipfsEndpoint, ipfsCID);
    log(`Downloading bot package: ${botPackageUrl}`);
    await fs.ensureDir(baseDirectory);
    try {
      await download(botPackageUrl, baseDirectory, { extract: true, timeout: DOWNLOAD_TIMEOUT, rejectUnauthorized: false });
      log(`Bot package downloaded: ${baseDirectory}`);
    } catch (err) {
      await fs.remove(baseDirectory);
      throw err;
    }
  }
}

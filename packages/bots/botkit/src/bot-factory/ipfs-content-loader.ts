//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import download from 'download';
import fetch from 'node-fetch';
import path from 'path';
import { URL } from 'url';

const DOWNLOAD_TIMEOUT = 10000;

const log = debug('dxos:botkit:bot-factory:ipfs-content-loader');

export interface ContentLoader {
  /**
   * Downloads a file from the CDN and saves it to the specified filesystem directory.
   * @returns The path to the downloaded file.
   */
  download: (id: string, dir: string) => Promise<string>
}

export class IPFSContentLoader implements ContentLoader {
  constructor (
    private readonly _ipfsEndpoint: string
  ) {}

  async download (ipfsCid: string, dir: string): Promise<string> {
    const url = `${this._ipfsEndpoint}/${ipfsCid}/`;
    const files = await (await fetch(`${new URL(this._ipfsEndpoint).origin}/api/v0/ls?arg=${ipfsCid}`, { method: 'POST' })).json();
    for await (const file of files.Objects[0].Links) {
      const path = url + file.Name;
      log(`Downloading: ${path}`);
      await download(path, dir, { extract: true, timeout: DOWNLOAD_TIMEOUT, rejectUnauthorized: false });
    }

    const localPath = path.join(dir, 'main.js');
    return localPath;
  }
}

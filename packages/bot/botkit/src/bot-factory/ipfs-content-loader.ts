//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import download from 'download';
import fs from 'fs';
import path from 'path';

const DOWNLOAD_TIMEOUT = 10000;

export interface ContentLoader {
  /**
   * Downloads a file from the CDN and saves it to the specified filesystem directory.
   * @returns The path to the downloaded file.
   */
  download: (id: string, dir: string) => Promise<string>;
}

export class IPFSContentLoader implements ContentLoader {
  constructor (
    private readonly _ipfsEndpoint: string
  ) {}

  async download (ipfsCid: string, dir: string): Promise<string> {
    const url = `${this._ipfsEndpoint}/${ipfsCid}`;
    await download(url, dir, { extract: true, timeout: DOWNLOAD_TIMEOUT, rejectUnauthorized: false, filename: ipfsCid });
    const localPath = path.join(dir, ipfsCid);
    return localPath;
  }
}

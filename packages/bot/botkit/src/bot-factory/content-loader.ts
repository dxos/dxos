//
// Copyright 2021 DXOS.org
//

import assert from "assert";
import download from 'download';
import fs from 'fs';
import path from 'path';

import { CID, DXN, IRegistryClient, RegistryDataRecord } from "@dxos/registry-client";

import type { BotPackageSpecifier } from "../proto/gen/dxos/bot";
import type { Bot } from "../proto/gen/dxos/type";

const DOWNLOAD_TIMEOUT = 10000;

export interface ContentLoader {
  /**
   * Downloads a file from the CDN and saves it to the specified filesystem path.
   */
  download: (pkg: BotPackageSpecifier, dir: string) => Promise<string>;
}

export class DXNSContentLoader implements ContentLoader {
  constructor (
    private readonly _registry: IRegistryClient,
    private readonly _ipfsEndpoint: string
  ) {}

  async download (pkg: BotPackageSpecifier, dir: string): Promise<string> {
    // Clone object to not modify the original.
    pkg = { ...pkg };

    if(pkg.dxn) {
      pkg.ipfsCid = (await this._resolveDXN(DXN.parse(pkg.dxn))).toString();
      pkg.dxn = undefined;
    }

    if (pkg.ipfsCid) {
      const url = `${this._ipfsEndpoint}/${pkg.ipfsCid}`;
      await download(url, dir, { extract: true, timeout: DOWNLOAD_TIMEOUT, rejectUnauthorized: false, filename: pkg.ipfsCid });
      pkg.localPath = path.join(dir, pkg.ipfsCid);
      pkg.ipfsCid = undefined;
    }

    assert(pkg.localPath, 'Couldn\'t resolve bot package specifier.');
    await fs.promises.access(pkg.localPath, fs.constants.F_OK);
    return pkg.localPath;
  };

  async _resolveDXN(dxn: DXN): Promise<CID> {
    const botResourceRecord = await this._registry.getResourceRecord<RegistryDataRecord<Bot>>(dxn, 'latest');
    assert(botResourceRecord, `Bot resource not found: ${dxn.toString()}`);
    const botIpfsCID = botResourceRecord.record.data.hash;
    assert(botIpfsCID, `Bot IPFS CID not specified: ${dxn.toString()}`);
    return CID.from(botIpfsCID);
  }
}

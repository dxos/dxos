//
// Copyright 2021 DXOS.org
//

import assert from "assert";

import { CID, DXN, IRegistryClient, RegistryDataRecord } from "@dxos/registry-client";

import { BotPackageSpecifier } from "../proto/gen/dxos/bot";
import { Bot } from "../proto/gen/dxos/type";

export type ContentResolverResult = Exclude<BotPackageSpecifier, "dxn">;

export interface ContentResolver {
  /**
   * Resolves resource identifier to a specifier where the content can be downloaded from.
   * @returns A specifier where the content can be downloaded from.
   */
  resolve: (dxn: string) => Promise<ContentResolverResult>;
}

export class DXNSContentResolver implements ContentResolver {
  constructor (
    private readonly _registry: IRegistryClient
  ) {}

  async resolve (dxn: string): Promise<ContentResolverResult> {
    const botDXN = DXN.parse(dxn);
    const botResourceRecord = await this._registry.getResourceRecord<RegistryDataRecord<Bot>>(botDXN, 'latest');
    assert(botResourceRecord, `Bot resource not found: ${dxn.toString()}`);
    const botIpfsCID = botResourceRecord.record.data.hash;
    const botLocalPath = botResourceRecord.record.data.localPath;
    if (!botIpfsCID && !botLocalPath) {
      throw new Error(`Unable to resolve bot content byt the provided dxn: ${dxn.toString()}`);
    }
    let result: ContentResolverResult = {};
    if (botIpfsCID) {
      result.ipfsCid = CID.from(botIpfsCID).toString();
    }
    result.localPath = botLocalPath;
    return result;
  }
}

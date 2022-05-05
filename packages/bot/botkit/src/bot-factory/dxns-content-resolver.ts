//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { CID, DXN, IRegistryClient, RegistryDataRecord } from '@dxos/registry-client';

import { BotPackageSpecifier } from '../proto/gen/dxos/bot';
import { Bot } from '../proto/gen/dxos/type';

export type ContentResolverResult = Omit<BotPackageSpecifier, 'dxn' | 'name'>;

export interface ContentResolver {
  /**
   * Resolves resource identifier to a specifier where the content can be downloaded from.
   * @returns A specifier where the content can be downloaded from.
   */
  resolve: ({ dxn, name }: { dxn?: string, name?: string }) => Promise<ContentResolverResult>;
}

export class DXNSContentResolver implements ContentResolver {
  constructor (
    private readonly _registry: IRegistryClient
  ) {}

  async resolve ({ dxn, name }: { dxn?: string, name?: string }): Promise<ContentResolverResult> {
    const [packageDXN, versionOrTag = 'latest'] = (name ?? dxn)!.split('@', 2);
    const botDXN = DXN.parse(packageDXN);
    const botResourceRecord = await this._registry.getResourceRecord<RegistryDataRecord<Bot>>(botDXN, versionOrTag);
    assert(botResourceRecord, `Bot resource not found: ${packageDXN.toString()}@${versionOrTag}`);
    const botIpfsCID = botResourceRecord.record.data.bundle;
    const botLocalPath = botResourceRecord.record.data.localPath;
    if (!botIpfsCID && !botLocalPath) {
      throw new Error(`Unable to resolve bot content byt the provided dxn: ${packageDXN.toString()}`);
    }

    const result: ContentResolverResult = {};
    if (botIpfsCID) {
      result.ipfsCid = CID.from(botIpfsCID).toString();
    }
    result.localPath = botLocalPath;
    return result;
  }
}

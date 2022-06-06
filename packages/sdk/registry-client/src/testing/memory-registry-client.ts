//
// Copyright 2021 DXOS.org
//

import { RegistryClientBackend } from 'sample-polkadotjs-typegen/registry-client-backend';

import { ComplexMap } from '@dxos/util';

import { Record as DXNSRecord } from '../proto';
import {
  AccountKey,
  CID,
  Domain,
  DomainKey,
  DXN,
  Resource
} from '../types';

/**
 * In-memory implementation of the registry client with statically specified records.
 * Useful for testing code which relies on the DXNS registry without connecting to a real node.
 */
export class MemoryRegistryClientBackend implements RegistryClientBackend {
  private readonly _domains = new Map<string, Domain>();
  private readonly _resources = new ComplexMap<DXN, Resource>(dxn => dxn.toString());
  private readonly _records = new ComplexMap<CID, DXNSRecord>(cid => cid.toB58String());

  //
  // Domains
  //

  async getDomainKey (domainName: string): Promise<DomainKey> {
    const domain = this._domains.get(domainName);
    if (!domain) {
      throw new Error('Domain not found');
    }

    return domain.key;
  }

  async getDomains (): Promise<Domain[]> {
    return Array.from(this._domains.values());
  }

  // TODO(wittjosiah): Domain names.
  async createDomain (accountKey: AccountKey): Promise<DomainKey> {
    const key = DomainKey.random();
    this._domains.set(key.toString(), {
      key,
      owner: accountKey.toHex()
    });
    return key;
  }

  //
  // Resources
  //

  async getResource (name: DXN): Promise<Resource | undefined> {
    return this._resources.get(name);
  }

  async getResources (): Promise<Resource[]> {
    return Array.from(this._resources.values());
  }

  async setResource (
    name: DXN,
    tag: string,
    cid: CID | undefined
  ): Promise<void> {
    const resource = this._resources.get(name) ?? { name, tags: {} };
    this._resources.set(name, {
      ...resource,
      tags: {
        ...resource.tags,
        [tag]: cid
      }
    });
  }

  //
  // Records
  //

  async getRecord (cid: CID): Promise<DXNSRecord | undefined> {
    return this._records.get(cid);
  }

  async getRecords (): Promise<DXNSRecord[]> {
    return Array.from(this._records.values());
  }

  // TODO(wittjosiah): Implement.
  async createRecord (record: DXNSRecord): Promise<CID> {
    throw new Error('Not implemented');
  }
}

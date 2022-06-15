//
// Copyright 2021 DXOS.org
//

import { compactAddLength } from '@polkadot/util';
import { webcrypto as crypto } from 'crypto';

import { ComplexMap } from '@dxos/util';

import {
  AccountKey,
  CID,
  Domain,
  DomainKey,
  DXN,
  RecordWithCid,
  RegistryClientBackend
} from '../api';
import { Record as RawRecord, schema as dxnsSchema } from '../proto';

/**
 * In-memory implementation of the registry client with statically specified records.
 * Useful for testing code which relies on the DXNS registry without connecting to a real node.
 */
export class MemoryRegistryClientBackend implements RegistryClientBackend {
  readonly domains = new Map<string, Domain>();
  readonly resources = new ComplexMap<DXN, CID>(dxn => dxn.toString());
  readonly records = new ComplexMap<CID, RawRecord>(cid => cid.toB58String());

  //
  // Domains
  //

  async getDomainKey (domainName: string): Promise<DomainKey> {
    const domain = this.domains.get(domainName);
    if (!domain) {
      throw new Error('Domain not found');
    }

    return domain.key;
  }

  async getDomains (): Promise<Domain[]> {
    return Array.from(this.domains.values());
  }

  async registerDomainKey (owner: AccountKey): Promise<DomainKey> {
    const key = DomainKey.random();
    this.domains.set(key.toString(), {
      key,
      owner: owner.toHex()
    });
    return key;
  }

  async registerDomainName (domainName: string, owner: AccountKey): Promise<Domain> {
    const key = DomainKey.random();
    const domain = {
      key,
      name: domainName,
      owner: owner.toHex()
    };
    this.domains.set(domainName, domain);
    return domain;
  }

  //
  // Resources
  //

  async getResource (name: DXN): Promise<CID | undefined> {
    return this.resources.get(name);
  }

  async getResources (): Promise<[DXN, CID][]> {
    return Array.from(this.resources.entries());
  }

  async registerResource (
    name: DXN,
    cid: CID | undefined,
    owner: AccountKey
  ): Promise<void> {
    const domainName = typeof name.authority === 'string' ? name.authority : name.authority.toHex();
    const domain = this.domains.get(domainName);
    if (domain?.owner !== owner.toHex()) {
      throw new Error('Domain owner mismatch');
    }

    if (cid) {
      this.resources.set(name, cid);
    } else {
      this.resources.delete(name);
    }
  }

  //
  // Records
  //

  async getRecord (cid: CID): Promise<RecordWithCid | undefined> {
    return { cid, ...this.records.get(cid) };
  }

  async getRecords (): Promise<RecordWithCid[]> {
    return Array.from(this.records.entries()).map(([cid, record]) => ({ cid, ...record }));
  }

  async registerRecord (record: RawRecord): Promise<CID> {
    const data = compactAddLength(dxnsSchema
      .getCodecForType('dxos.registry.Record')
      .encode(record)
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    const cid = CID.from(Uint8Array.from([18, 32, ...digest]));
    this.records.set(cid, record);

    return cid;
  }
}

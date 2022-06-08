//
// Copyright 2021 DXOS.org
//

import { compactAddLength } from '@polkadot/util';
import assert from 'assert';
import { webcrypto as crypto } from 'crypto';

import { ComplexMap } from '@dxos/util';

import { Record as RawRecord, schema as dxnsSchema } from '../proto';
import { RegistryClientBackend } from '../registry-client-backend';
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
  readonly domains = new Map<string, Domain>();
  readonly resources = new ComplexMap<DXN, Resource>(dxn => dxn.toString());
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

  async getResource (name: DXN): Promise<Resource | undefined> {
    return this.resources.get(name);
  }

  async getResources (): Promise<Resource[]> {
    return Array.from(this.resources.values());
  }

  async registerResource (
    name: DXN,
    cid: CID | undefined,
    owner: AccountKey,
    tag: string
  ): Promise<void> {
    const domainName = name.domain ?? name.key?.toHex();
    assert(domainName, 'DXN must have either domain or key');
    const domain = this.domains.get(domainName);
    if (domain?.owner !== owner.toHex()) {
      throw new Error('Domain owner mismatch');
    }

    const resource = this.resources.get(name) ?? { name, tags: {} };
    this.resources.set(name, {
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

  async getRecord (cid: CID): Promise<RawRecord | undefined> {
    return this.records.get(cid);
  }

  async getRecords (): Promise<RawRecord[]> {
    return Array.from(this.records.values());
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

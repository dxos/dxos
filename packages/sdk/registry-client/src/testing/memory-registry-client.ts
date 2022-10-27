//
// Copyright 2021 DXOS.org
//

import { compactAddLength } from '@polkadot/util';
import { webcrypto as crypto } from 'crypto';
import assert from 'node:assert';

import { schema } from '@dxos/protocols';
import { Record as RawRecord } from '@dxos/protocols/proto/dxos/registry';
import { ComplexMap } from '@dxos/util';

import { AccountKey, Authority, CID, DomainKey, DXN, RecordWithCid, RegistryClientBackend } from '../api';

/**
 * In-memory implementation of the registry client with statically specified records.
 * Useful for testing code which relies on the DXNS registry without connecting to a real node.
 */
// TODO(wittjosiah): Support accounts and auctions in the memory registry.
export class MemoryRegistryClientBackend implements RegistryClientBackend {
  readonly authorities = new Map<string, Authority>();
  readonly resources = new ComplexMap<DXN, CID>((dxn) => dxn.toString());
  readonly records = new ComplexMap<CID, RawRecord>((cid) => cid.toB58String());

  //
  // Domains
  //

  async getDomainKey(domainName: string): Promise<DomainKey> {
    const authority = this.authorities.get(domainName);
    if (!authority) {
      throw new Error('Authority not found');
    }

    return authority.key;
  }

  async listAuthorities(): Promise<Authority[]> {
    return Array.from(this.authorities.values());
  }

  async registerAuthority(owner: AccountKey): Promise<DomainKey> {
    const key = DomainKey.random();
    this.authorities.set(key.toString(), {
      key,
      owner: owner.toHex()
    });

    return key;
  }

  async registerDomainName(domainName: string, owner: AccountKey): Promise<Authority> {
    const key = DomainKey.random();
    const authority = {
      key,
      name: domainName,
      owner: owner.toHex()
    };
    this.authorities.set(domainName, authority);

    return authority;
  }

  //
  // Resources
  //

  async getResource(name: DXN): Promise<CID | undefined> {
    return this.resources.get(name);
  }

  async listResources(): Promise<[DXN, CID][]> {
    return Array.from(this.resources.entries());
  }

  async registerResource(name: DXN, cid: CID | undefined, owner: AccountKey): Promise<void> {
    assert(name.tag, 'Tag is required');
    const domainName = typeof name.authority === 'string' ? name.authority : name.authority.toHex();
    const domain = this.authorities.get(domainName);
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

  async getRecord(cid: CID): Promise<RecordWithCid | undefined> {
    return { cid, ...this.records.get(cid) };
  }

  async listRecords(): Promise<RecordWithCid[]> {
    return Array.from(this.records.entries()).map(([cid, record]) => ({
      cid,
      ...record
    }));
  }

  async registerRecord(record: RawRecord): Promise<CID> {
    const data = compactAddLength(schema.getCodecForType('dxos.registry.Record').encode(record));

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    const cid = CID.from(Uint8Array.from([18, 32, ...digest]));
    this.records.set(cid, record);

    return cid;
  }
}

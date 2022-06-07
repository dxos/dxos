//
// Copyright 2022 DXOS.org
//

import { BTreeMap, Text } from '@polkadot/types';
import { Option } from '@polkadot/types/codec/Option';
import { compactAddLength } from '@polkadot/util';
import assert from 'assert';

import { isNotNullOrUndefined } from '@dxos/util';

import { BaseClient } from './base-client';
import { Multihash, Resource as BaseResource, Record as PolkadotRecord } from './interfaces';
import { Record as DXNSRecord, schema as dxnsSchema } from './proto';
import {
  CID, Domain, DomainKey,
  AccountKey,
  DXN,
  Resource
} from './types';

/**
 * Minimal API for DXNS registry client backend.
 */
// TODO(wittjosiah): Don't use DXN? Fully specify resource parts in backend?
export interface RegistryClientBackend {
  getDomainKey (domain: string): Promise<DomainKey>
  getDomains (): Promise<Domain[]>
  registerDomainKey (owner: AccountKey): Promise<DomainKey>
  getResource (name: DXN): Promise<Resource | undefined>
  getResources (): Promise<Resource[]>
  registerResource (
    name: DXN,
    cid: CID | undefined,
    owner: AccountKey,
    // TODO(wittjosiah): Will be removed once tags are integrated with DXN.
    tag: string
  ): Promise<void>
  getRecord (cid: CID): Promise<DXNSRecord | undefined>
  getRecords (): Promise<DXNSRecord[]>
  registerRecord (record: DXNSRecord): Promise<CID>
}

/**
 * Polkadot DXNS registry client backend
 */
// TODO(wittjosiah): Review if BaseClient is useful.
export class PolkadotRegistryClientBackend extends BaseClient implements RegistryClientBackend {
  //
  // Domains
  //

  async getDomainKey (domain: string): Promise<DomainKey> {
    const rawKey = (await this.api.query.registry.domainNames(domain)).unwrap().toU8a();
    return new DomainKey(rawKey);
  }

  async getDomains (): Promise<Domain[]> {
    const domains = await this.api.query.registry.domains.entries();
    return domains.map(domainEntry => {
      const key = new DomainKey(domainEntry[0].args[0].toU8a());
      const domain = domainEntry[1].unwrap();
      return {
        key,
        name: domain.name.unwrapOr(undefined)?.toString(),
        owner: domain.owner.toHex()
      };
    });
  }

  async registerDomainKey (owner: AccountKey): Promise<DomainKey> {
    const domainKey = DomainKey.random();
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.registerDomain(domainKey.value, owner.value));
    return domainKey;
  }

  //
  // Resources
  //

  async getResource (name: DXN): Promise<Resource | undefined> {
    const domainKey = name.domain ? await this.getDomainKey(name.domain) : name.key;
    assert(domainKey, 'Domain not found');

    const resource = (await this.api.query.registry.resources<Option<BaseResource>>(domainKey.value, name.resource))
      .unwrapOr(undefined);
    if (resource === undefined) {
      return undefined;
    }

    return {
      name,
      ...this._decodeResource(resource)
    };
  }

  async getResources (): Promise<Resource[]> {
    const [resources, domains] = await Promise.all([
      this.api.query.registry.resources.entries<Option<BaseResource>>(),
      this.getDomains()
    ]);

    const result = resources
      .map(([key, resource]) => {
        const path = key.args[1].toString();
        const domainKey = new DomainKey(key.args[0].toU8a());
        const domain = domains.find(domain => domain.key.toHex() === domainKey.toHex());
        const name = domain?.name ? DXN.fromDomainName(domain.name, path) : DXN.fromDomainKey(domainKey, path);

        return {
          name,
          ...this._decodeResource(resource.unwrap())
        };
      });

    return result;
  }

  async registerResource (
    name: DXN,
    cid: CID,
    owner: AccountKey,
    tag: string
  ): Promise<void> {
    const domainKey = name.domain ? await this.getDomainKey(name.domain) : name.key;
    assert(domainKey, 'Domain not found');

    if (!cid) {
      await this.transactionsHandler.sendTransaction(
        this.api.tx.registry.deleteResource(
          domainKey.value,
          owner.value,
          name.resource
        )
      );
    } else {
      await this.transactionsHandler.sendTransaction(
        this.api.tx.registry.updateResource(
          domainKey.value,
          owner.value,
          name.resource,
          cid.value,
          null, // TODO(wittjosiah): Remove versions.
          [tag]
        )
      );
    }
  }

  private _decodeResource (resource: BaseResource): Omit<Resource, 'name'> {
    const decodeMap = (map: BTreeMap<Text, Multihash>): Record<string, CID> => {
      return Object.fromEntries(
        Array.from(map.entries())
          .map(([key, value]) => [key.toString(), CID.from(value.toU8a())])
      );
    };

    return {
      tags: decodeMap(resource.tags ?? new Map())
    };
  }

  //
  // Records
  //

  async getRecord (cid: CID): Promise<DXNSRecord | undefined> {
    const record = (await this.api.query.registry.records(cid.value)).unwrapOr(undefined);
    if (record === undefined) {
      return undefined;
    }

    return this._decodeRecord(record);
  }

  async getRecords (): Promise<DXNSRecord[]> {
    const records = await this.api.query.registry.records.entries();

    const result = records
      .map(([, record]) => {
        try {
        // TODO(marik-d): Moderately unoptimized.
          return this._decodeRecord(record.unwrap());
        } catch (err: any) {
          return undefined;
        }
      })
      .filter(isNotNullOrUndefined);

    return result;
  }

  async registerRecord (record: DXNSRecord): Promise<CID> {
    const data = compactAddLength(dxnsSchema
      .getCodecForType('dxos.registry.Record')
      .encode(record)
    );
    const { events } = await this.transactionsHandler
      .sendTransaction(this.api.tx.registry.addRecord(data));
    const event = events
      .map(eventRecord => eventRecord.event)
      .find(this.api.events.registry.RecordAdded.is);
    assert(event && this.api.events.registry.RecordAdded.is(event));
    return new CID(event.data[1].toU8a());
  }

  private _decodeRecord (record: PolkadotRecord): DXNSRecord {
    return dxnsSchema
      .getCodecForType('dxos.registry.Record')
      .decode(Buffer.from(record.data));
  }
}

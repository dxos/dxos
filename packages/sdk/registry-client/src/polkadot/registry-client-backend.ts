//
// Copyright 2022 DXOS.org
//

import { BTreeMap, Text } from '@polkadot/types';
import { Option } from '@polkadot/types/codec/Option';
import { compactAddLength } from '@polkadot/util';
import assert from 'assert';

import { isNotNullOrUndefined } from '@dxos/util';

import {
  AccountKey,
  CID,
  Domain,
  DomainKey,
  DXN,
  RecordWithCid,
  RegistryClientBackend,
  Resource
} from '../api';
import { Record as RawRecord, schema as dxnsSchema } from '../proto';
import { BaseClient } from './base-client';
import { Multihash, Resource as BaseResource, Record as PolkadotRecord } from './interfaces';

/**
 * Polkadot DXNS registry client backend
 */
// TODO(wittjosiah): Review if BaseClient is useful.
export class PolkadotRegistryClientBackend extends BaseClient implements RegistryClientBackend {
  //
  // Domains
  //

  async getDomainKey (domainName: string): Promise<DomainKey> {
    const rawKey = (await this.api.query.registry.domainNames(domainName)).unwrap().toU8a();
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
    const domainKey = typeof name.authority === 'string' ? await this.getDomainKey(name.authority) : name.authority;
    assert(domainKey, 'Domain not found');

    const resource = (await this.api.query.registry.resources<Option<BaseResource>>(domainKey.value, name.path))
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
    const domainKey = typeof name.authority === 'string' ? await this.getDomainKey(name.authority) : name.authority;
    assert(domainKey, 'Domain not found');

    if (!cid) {
      await this.transactionsHandler.sendTransaction(
        this.api.tx.registry.deleteResource(
          domainKey.value,
          owner.value,
          name.path
        )
      );
    } else {
      await this.transactionsHandler.sendTransaction(
        this.api.tx.registry.updateResource(
          domainKey.value,
          owner.value,
          name.path,
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

  async getRecord (cid: CID): Promise<RecordWithCid | undefined> {
    const record = (await this.api.query.registry.records(cid.value)).unwrapOr(undefined);
    if (record === undefined) {
      return undefined;
    }

    return { cid, ...this._decodeRecord(record) };
  }

  async getRecords (): Promise<RecordWithCid[]> {
    const records = await this.api.query.registry.records.entries();

    const result = records
      .map(([key, record]) => {
        const cid = CID.from(key.args[0]);

        try {
        // TODO(marik-d): Moderately unoptimized.
          return { cid, ...this._decodeRecord(record.unwrap()) };
        } catch (err: any) {
          return undefined;
        }
      })
      .filter(isNotNullOrUndefined);

    return result;
  }

  async registerRecord (record: RawRecord): Promise<CID> {
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

  private _decodeRecord (record: PolkadotRecord): RawRecord {
    return dxnsSchema
      .getCodecForType('dxos.registry.Record')
      .decode(Buffer.from(record.data));
  }
}

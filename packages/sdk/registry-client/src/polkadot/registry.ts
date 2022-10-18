//
// Copyright 2022 DXOS.org
//

import { BTreeMap, Text } from '@polkadot/types';
import { Option } from '@polkadot/types/codec/Option';
import { compactAddLength } from '@polkadot/util';
import assert from 'node:assert';

import { schema } from '@dxos/protocols';
import { Record as RawRecord } from '@dxos/protocols/proto/dxos/registry';
import { isNotNullOrUndefined } from '@dxos/util';

import {
  AccountKey,
  Authority,
  CID,
  DomainKey,
  DXN,
  RecordWithCid,
  RegistryClientBackend
} from '../api';
import { Multihash, Resource as BaseResource, Record as PolkadotRecord } from './interfaces';
import { PolkadotClient } from './polkadot-client';

/**
 * Polkadot DXNS registry client backend.
 */
export class PolkadotRegistry extends PolkadotClient implements RegistryClientBackend {
  //
  // Domains
  //

  async getDomainKey (domainName: string): Promise<DomainKey> {
    const rawKey = (await this.api.query.registry.domainNames(domainName)).unwrap().toU8a();

    return new DomainKey(rawKey);
  }

  async listAuthorities (): Promise<Authority[]> {
    const domains = await this.api.query.registry.domains.entries();

    return domains.map(domainEntry => {
      const key = new DomainKey(domainEntry[0].args[0].toU8a());
      const domain = domainEntry[1].unwrap();
      const authority: Authority = {
        key,
        domainName: domain.name.unwrapOr(undefined)?.toString(),
        owner: domain.owner.toHex()
      };

      return authority;
    });
  }

  async registerAuthority (owner: AccountKey): Promise<DomainKey> {
    const domainKey = DomainKey.random();
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.registerDomain(domainKey.value, owner.value));

    return domainKey;
  }

  //
  // Resources
  //

  async getResource (name: DXN): Promise<CID | undefined> {
    assert(name.tag, 'Tag is required');

    const authority = typeof name.authority === 'string' ? await this.getDomainKey(name.authority) : name.authority;
    assert(authority, 'Authority not found');

    const resource = (await this.api.query.registry
      .resources<Option<BaseResource>>(authority.value, name.path))
      .unwrapOr(undefined);
    if (!resource) {
      return undefined;
    }

    const tags = this._decodeResource(resource);
    return tags[name.tag];
  }

  async listResources (): Promise<[DXN, CID][]> {
    const [resources, authorities] = await Promise.all([
      this.api.query.registry.resources.entries<Option<BaseResource>>(),
      this.listAuthorities()
    ]);

    const result = resources
      .flatMap(([key, resource]) => {
        const path = key.args[1].toString();
        const domainKey = new DomainKey(key.args[0].toU8a());
        const authority = authorities.find(authority => authority.key.toHex() === domainKey.toHex());
        const tags = this._decodeResource(resource.unwrap());

        return Object.entries(tags).map(([tag, cid]): [DXN, CID] => [
          authority?.domainName
            ? DXN.fromDomainName(authority.domainName, path, tag)
            : DXN.fromDomainKey(domainKey, path, tag),
          cid
        ]);
      });

    return result;
  }

  async registerResource (
    name: DXN,
    cid: CID,
    owner: AccountKey
  ): Promise<void> {
    assert(name.tag, 'Tag is required');
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
          [name.tag]
        )
      );
    }
  }

  private _decodeResource (resource: BaseResource): Record<string, CID> {
    const decodeMap = (map: BTreeMap<Text, Multihash>): Record<string, CID> => Object.fromEntries(
      Array.from(map.entries())
        .map(([key, value]) => [key.toString(), CID.from(value.toU8a())])
    );

    return decodeMap(resource.tags ?? new Map());
  }

  //
  // Records
  //

  async getRecord (cid: CID): Promise<RecordWithCid | undefined> {
    const record = (await this.api.query.registry.records(cid.value)).unwrapOr(undefined);
    if (!record) {
      return undefined;
    }

    return { cid, ...this._decodeRecord(record) };
  }

  async listRecords (): Promise<RecordWithCid[]> {
    const records = await this.api.query.registry.records.entries();

    const result = records
      .map(([key, record]) => {
        const cid = CID.from(key.args[0]);

        try {
        // TODO(dmaretskyi): Moderately unoptimized.
          return { cid, ...this._decodeRecord(record.unwrap()) };
        } catch (err: any) {
          return undefined;
        }
      })
      .filter(isNotNullOrUndefined);

    return result;
  }

  async registerRecord (record: RawRecord): Promise<CID> {
    const data = compactAddLength(schema
      .getCodecForType('dxos.registry.Record')
      .encode(record)
    );

    return this.registerRecordBytes(data);
  }

  async registerRecordBytes (data: Uint8Array): Promise<CID> {
    const { events } = await this.transactionsHandler
      .sendTransaction(this.api.tx.registry.addRecord(data));
    const event = events
      .map(eventRecord => eventRecord.event)
      .find(this.api.events.registry.RecordAdded.is);
    assert(event && this.api.events.registry.RecordAdded.is(event));

    return new CID(event.data[1].toU8a());
  }

  private _decodeRecord (record: PolkadotRecord): RawRecord {
    return schema
      .getCodecForType('dxos.registry.Record')
      .decode(Buffer.from(record.data));
  }
}

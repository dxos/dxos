//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { AddressOrPair } from '@polkadot/api/types';
import { BTreeMap, StorageKey, Text } from '@polkadot/types';
import { Option } from '@polkadot/types/codec/Option';
import { compactAddLength } from '@polkadot/util';
import assert from 'assert';
import protobuf from 'protobufjs';

import { ComplexMap, raise } from '@dxos/util';

import { ApiTransactionHandler } from '../api-transaction-handler';
import { decodeExtensionPayload, decodeProtobuf, encodeExtensionPayload, encodeProtobuf, sanitizeExtensionData } from '../encoding';
import { DomainKey as BaseDomainKey, Multihash, Resource as BaseResource } from '../interfaces';
import { CID, DomainKey, DXN } from '../models';
import { schema as dxnsSchema } from '../proto/gen';
import { Filtering, IQuery } from '../querying';
import { Domain, IRegistryClient, RecordKind, RecordMetadata, RegistryDataRecord, RegistryRecord, RegistryTypeRecord, Resource, ResourceRecord, SuppliedRecordMetadata, UpdateResourceOptions } from './interface';

export class RegistryClient implements IRegistryClient {
  private readonly _recordCache = new ComplexMap<CID, RegistryRecord>(cid => cid.toB58String())

  private transactionsHandler: ApiTransactionHandler;

  constructor (private api: ApiPromise, private signer?: AddressOrPair) {
    this.transactionsHandler = new ApiTransactionHandler(api, signer);
  }

  async resolveRecordCid (dxn: DXN): Promise<CID | undefined> {
    let domainKey: DomainKey | undefined;
    if (dxn.domain) {
      domainKey = await this.resolveDomainName(dxn.domain);
      if (!domainKey) {
        return undefined;
      }
    } else {
      assert(dxn.key);
      domainKey = dxn.key;
    }

    const multihash = (await this.api.query.registry.resources(domainKey.value, dxn.resource)).unwrapOr(undefined);
    if (!multihash) {
      return undefined;
    }

    return new CID(multihash.toU8a());
  }

  async resolveDomainName (domainName: string): Promise<DomainKey> {
    return new DomainKey((await this.api.query.registry.domainNames(domainName)).unwrap().toU8a());
  }

  async getDomains (): Promise<Domain[]> {
    const domains = await this.api.query.registry.domains.entries();
    return domains.map(domainEntry => {
      const key = new DomainKey(domainEntry[0].args[0].toU8a());
      const domain = domainEntry[1].unwrap();
      return {
        key,
        name: domain.name.unwrapOr(undefined)?.toString(),
        owners: domain.owners.map(owner => owner.toHuman())
      };
    });
  }

  async getRecord (cid: CID): Promise<RegistryRecord | undefined> {
    if (this._recordCache.has(cid)) {
      return this._recordCache.get(cid);
    }

    const record = (await this.api.query.registry.records(cid.value)).unwrapOr(undefined);
    if (!record) {
      return undefined;
    }

    const decoded = dxnsSchema.getCodecForType('dxos.registry.Record').decode(Buffer.from(record.data));

    const meta: RecordMetadata = {
      description: decoded.description,
      created: decoded.created
    };

    if (decoded.payload) {
      assert(decoded.payload.typeRecord);
      assert(decoded.payload.data);

      const typeRecord = await this.getRecord(CID.from(decoded.payload.typeRecord));
      assert(typeRecord, 'Dangling record type reference.');
      assert(typeRecord.kind === RecordKind.Type, 'Invalid type record kind.');

      return {
        kind: RecordKind.Data,
        cid,
        meta,
        type: CID.from(decoded.payload.typeRecord),
        dataRaw: decoded.payload.data,
        dataSize: decoded.payload.data.length,
        data: await decodeExtensionPayload(decoded.payload, async cid => (await this.getTypeRecord(cid)) ?? raise(new Error(`Type not found: ${cid}`)))
      };
    } else if (decoded.type) {
      assert(decoded.type.protobufDefs);
      assert(decoded.type.messageName);

      return {
        kind: RecordKind.Type,
        cid,
        meta,
        protobufDefs: decodeProtobuf(decoded.type.protobufDefs),
        messageName: decoded.type.messageName
      };
    } else {
      throw new Error('Malformed record');
    }
  }

  async getRecords (query?: IQuery): Promise<RegistryRecord[]> {
    const records = await this.api.query.registry.records.entries();

    const output = await Promise.all(records.map(async ([storageKey]): Promise<RegistryRecord | undefined> => {
      const contentCid = storageKey.args[0];

      try {
        // TODO(marik-d): Very unoptimized.
        const record = await this.getRecord(CID.from(contentCid));
        assert(record);
        return record;
      } catch (err) {
        return undefined;
      }
    }));

    return output.filter(isNotNullOrUndefined).filter(record => Filtering.matchRecord(record, query));
  }

  async getDataRecord (cid: CID): Promise<RegistryDataRecord | undefined> {
    const record = await this.getRecord(cid);
    if (!record) {
      return undefined;
    }

    assert(RegistryRecord.isDataRecord(record));
    return record;
  }

  async getDataRecords <T = any> (query?: IQuery): Promise<RegistryDataRecord[]> {
    const records = await this.getRecords();

    return records
      .filter((record): record is RegistryDataRecord<T> => record.kind === RecordKind.Data)
      .filter(record => Filtering.matchRecord(record, query));
  }

  async getTypeRecord (cid: CID): Promise<RegistryTypeRecord | undefined> {
    const record = await this.getRecord(cid);
    if (!record) {
      return undefined;
    }

    assert(RegistryRecord.isTypeRecord(record));
    return record;
  }

  async getTypeRecords (query?: IQuery): Promise<RegistryTypeRecord[]> {
    // TODO(marik-d): Not optimal.
    const records = await this.getRecords();

    return records
      .filter((record): record is RegistryTypeRecord => record.kind === RecordKind.Type)
      .filter(record => Filtering.matchRecord(record, query));
  }

  /**
   * Transforms the Resource from the chain with Polkadot types to Typescript types and models.
   */
  private async decodeResourceBody (resource: BaseResource): Promise<Omit<Resource, 'id'>> {
    function decodeMap (map: BTreeMap<Text, Multihash>): Record<string, CID> {
      return Object.fromEntries(
        Array.from(map.entries())
          .map(([key, value]) => [key.toString(), CID.from(value.toU8a())])
      );
    }
    const tags = decodeMap(resource.tags ?? new Map());

    // A single record to query for the type.
    const selectedRecord = tags.latest ?? tags[Object.keys(tags)[0]];
    let type: CID | undefined;
    if (selectedRecord !== undefined) {
      try {
        const record = await this.getRecord(selectedRecord);
        assert(record && RegistryRecord.isDataRecord(record));

        type = record.type;
      } catch {} // TODO(marik-d): This will set type to `undefined` for both type records and when there's an error. We should be more precise.
    }

    return {
      tags,
      versions: decodeMap(resource.versions ?? new Map()),
      type
    };
  }

  /**
   * Transforms the Resource from the chain with Polkadot types to Typescript types and models.
   */
  private decodeResourceId (resourceKeys: StorageKey<[BaseDomainKey, Text]>, domains: Domain[]): Resource['id'] {
    const name = resourceKeys.args[1].toString();
    const domainKey = new DomainKey(resourceKeys.args[0].toU8a());
    const domain = domains.find(domain => domain.key.toHex() === domainKey.toHex());
    return domain?.name ? DXN.fromDomainName(domain.name, name) : DXN.fromDomainKey(domainKey, name);
  }

  async getResource (id: DXN): Promise<Resource | undefined> {
    const domainKey = id.domain ? await this.resolveDomainName(id.domain) : id.key;
    assert(domainKey);

    const resource = (await this.api.query.registry.resources<Option<BaseResource>>(domainKey.value, id.resource)).unwrapOr(undefined);
    if (resource === undefined) {
      return undefined;
    }
    return {
      id,
      ...await this.decodeResourceBody(resource)
    };
  }

  async getResourceRecord<R extends RegistryRecord = RegistryRecord> (id: DXN, versionOrTag = 'latest'): Promise<ResourceRecord<R> | undefined> {
    const resource = await this.getResource(id);
    if (resource === undefined) {
      return undefined;
    }
    const cid = resource.tags[versionOrTag] ?? resource.versions[versionOrTag];
    if (cid === undefined) {
      return undefined;
    }
    const record = await this.getRecord(cid);
    if (record === undefined) {
      return undefined;
    }
    return {
      resource,
      tag: resource.tags[versionOrTag] ? versionOrTag : undefined,
      version: resource.versions[versionOrTag] ? versionOrTag : undefined,
      record: record as R
    };
  }

  async queryResources (query?: IQuery): Promise<Resource[]> {
    const [resources, domains] = await Promise.all([
      this.api.query.registry.resources.entries<Option<BaseResource>>(),
      this.getDomains()
    ]);

    const result = await Promise.all(resources.map(async resource => ({
      id: this.decodeResourceId(resource[0], domains),
      ...await this.decodeResourceBody(resource[1].unwrap())
    })));

    return result.filter(isNotNullOrUndefined).filter(resource => Filtering.matchResource(resource, query));
  }

  async insertRawRecord (data: Uint8Array): Promise<CID> {
    const events = await this.transactionsHandler.sendTransaction(this.api.tx.registry.addRecord(compactAddLength(data)));
    const event = events.map(e => e.event).find(this.api.events.registry.RecordAdded.is);
    assert(event && this.api.events.registry.RecordAdded.is(event));
    return new CID(event.data[1].toU8a());
  }

  async insertDataRecord (data: unknown, typeId: CID, meta: SuppliedRecordMetadata = {}): Promise<CID> {
    const type = await this.getTypeRecord(typeId);
    assert(type);

    const encoded = dxnsSchema.getCodecForType('dxos.registry.Record').encode({
      ...meta,
      created: new Date(),
      payload: await encodeExtensionPayload(sanitizeExtensionData(data, CID.from(typeId)), async cid => (await this.getTypeRecord(cid)) ?? raise(new Error(`Type not found: ${cid}`)))
    });

    return this.insertRawRecord(encoded);
  }

  async insertTypeRecord (schema: protobuf.Root, messageName: string, meta: SuppliedRecordMetadata = {}) {
    // Make sure message type exists
    schema.lookupType(messageName);

    const encoded = dxnsSchema.getCodecForType('dxos.registry.Record').encode({
      ...meta,
      created: new Date(),
      type: {
        protobufDefs: encodeProtobuf(schema),
        messageName
        // TODO(marik-d): Source reference.
      }
    });

    return this.insertRawRecord(encoded);
  }

  async registerDomain (): Promise<DomainKey> {
    const domainKey = DomainKey.random();
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.registerDomain(domainKey.value));
    return domainKey;
  }

  async updateResource (resource: DXN, contentCid: CID, opts: UpdateResourceOptions = { tags: ['latest'] }): Promise<void> {
    const domainKey = resource.domain ? await this.resolveDomainName(resource.domain) : resource.key;
    assert(domainKey);
    await this.transactionsHandler.sendTransaction(
      this.api.tx.registry.updateResource(domainKey.value, resource.resource, contentCid.value, opts.version ?? null, opts.tags ?? []));
  }
}

export function getSchemaMessages (obj: protobuf.ReflectionObject): string[] {
  if (obj instanceof protobuf.Type) {
    return [obj.fullName];
  }

  if (obj instanceof protobuf.Namespace) {
    const messages: string[] = [];
    for (const nested of obj.nestedArray) {
      messages.push(...getSchemaMessages(nested));
    }
    return messages;
  }

  return [];
}

const isNotNullOrUndefined = <T> (x: T): x is Exclude<T, null | undefined> => x != null;

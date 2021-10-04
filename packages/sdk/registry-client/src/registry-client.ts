//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { AddressOrPair } from '@polkadot/api/types';
import { Option } from '@polkadot/types/codec/Option';
import { compactAddLength } from '@polkadot/util';
import assert from 'assert';
import protobuf from 'protobufjs';

import { ComplexMap, raise } from '@dxos/util';

import { ApiTransactionHandler } from './api-transaction-handler';
import { DXN } from './dxn';
import { decodeExtensionPayload, decodeProtobuf, encodeExtensionPayload, encodeProtobuf, RecordExtension, sanitizeExtensionData } from './encoding';
import { Multihash } from './interfaces';
import { CID, CIDLike, DomainKey } from './models';
import { schema as dxnsSchema } from './proto/gen';
import { Filtering, IQuery } from './querying';

export interface DomainInfo {
  key: DomainKey,
  name?: string,
  owners: string[],
}

export interface Resource<R extends RegistryRecord = RegistryRecord> {
  id: DXN
  record: R
}

export interface SuppliedRecordMetadata {
  version?: string;
  description?: string;
}

export interface InferredRecordMetadata {
  created?: Date;
}

export type RecordMetadata = SuppliedRecordMetadata & InferredRecordMetadata

export enum RecordKind {
  Type = 'TYPE',
  Data = 'DATA'
}

export interface RegistryRecordBase {
  kind: RecordKind
  cid: CID
  meta: RecordMetadata
}

export interface RegistryDataRecord<T = any> extends RegistryRecordBase {
  kind: RecordKind.Data
  type: CID
  dataSize: number
  dataRaw: Uint8Array,
  data: RecordExtension<T>
}

export interface RegistryTypeRecord extends RegistryRecordBase {
  kind: RecordKind.Type
  protobufDefs: protobuf.Root
  messageName: string
}

export type RegistryRecord = RegistryDataRecord | RegistryTypeRecord

export const RegistryRecord = {
  isDataRecord: (x: RegistryRecord): x is RegistryDataRecord => x.kind === RecordKind.Data,
  isTypeRecord: (x: RegistryRecord): x is RegistryTypeRecord => x.kind === RecordKind.Type
};

/**
 * DXNS Registry read-only operations.
 */
export interface IReadOnlyRegistryClient {
  /**
   * Resolves a CID of a record registered under a resource described with DXN name.
   * @param dxn Name of the resource which CID has to be resolved.
   */
  resolveRecordCid (dxn: DXN): Promise<CID | undefined>

  /**
   * Resolves a domain key from the domain name.
   * @param domainName Name of the domain.
   */
  resolveDomainName (domainName: string): Promise<DomainKey>

  /**
   * Returns a list of domains created in DXOS system.
   */
  getDomains (): Promise<DomainInfo[]>

  /**
   * Gets record details by CID.
   * @param cid CID of the record.
   */
  getRecord(cid: CIDLike): Promise<RegistryRecord | undefined>

  /**
   * Queries all records in the system.
   * @param query Query that each returned record must meet.
   */
  getRecords(query?: IQuery): Promise<RegistryRecord[]>

  /**
   * Gets data record details by CID.
   * @param cid CID of the record.
   */
  getDataRecord<T = any>(cid: CIDLike): Promise<RegistryDataRecord<T> | undefined>

  /**
   * Queries data records.
   * @param query Query that each returned record must meet.
   */
  getDataRecords<T = any>(query?: IQuery): Promise<RegistryDataRecord<T>[]>

  /**
   * Gets type records details by CID.
   * @param cid CID of the record.
   */
  getTypeRecord(cid: CIDLike): Promise<RegistryTypeRecord | undefined>

  /**
   * Queries type records.
   * @param query Query that each returned record must meet.
   */
  getTypeRecords(query?: IQuery): Promise<RegistryTypeRecord[]>

  /**
   * Gets resource by its registered name.
   * @param dxn Name of the resource used for registration.
   */
  getResource<R extends RegistryRecord = RegistryRecord> (dxn: DXN): Promise<Resource<R> | undefined>

  /**
   * Queries resources registered in the system.
   * @param query Query that each returned record must meet.
   */
  getResources (query?: IQuery): Promise<Resource[]>
}

/**
 * DXNS Registry modification operations.
 */
export interface IRegistryClient extends IReadOnlyRegistryClient {
  /**
   * Creates a new record in the system.
   * @param data Payload data of the record.
   */
  insertRawRecord (data: Uint8Array): Promise<CID>

  /**
   * Creates a new data record in the system.
   * @param data Payload data of the record.
   * @param typeCid CID of the type record that holds the schema of the data.
   * @param meta Record metadata information.
   */
  insertDataRecord (data: unknown, typeCid: CIDLike, meta?: SuppliedRecordMetadata): Promise<CID>

  /**
   * Creates a new type record in the system.
   * @param schema Protobuf schema of the type.
   * @param messageFqn Fully qualified name of the message. It must reside in the schema definition.
   * @param meta Record metadata information.
   */
  insertTypeRecord(schema: protobuf.Root, messageFqn: string, meta?: SuppliedRecordMetadata): Promise<CID>

  /**
   * Creates a new domain in the system under a generated name.
   */
  registerDomain (): Promise<DomainKey>

  /**
   * Registers a new resource in the system.
   * @param domainKey Identifies the domain of the resource to be registered in.
   * @param resourceName Identifies the name of the resource.
   * @param contentCid CID of the record to be referenced with the given name.
   */
  registerResource (domainKey: DomainKey, resourceName: string, contentCid: CID): Promise<void>
}

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

  async getDomains (): Promise<DomainInfo[]> {
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

  async getRecord (cidLike: CIDLike): Promise<RegistryRecord | undefined> {
    const cid = CID.from(cidLike);
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
      version: decoded.version,
      created: decoded.created
    };

    if (decoded.payload) {
      assert(decoded.payload.typeRecord);
      assert(decoded.payload.data);

      const typeRecord = await this.getRecord(decoded.payload.typeRecord);
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
        const record = await this.getRecord(contentCid);
        assert(record);
        return record;
      } catch (err) {
        return undefined;
      }
    }));

    return output.filter(isNotNullOrUndefined).filter(record => Filtering.matchRecord(record, query));
  }

  async getDataRecord (cid: CIDLike): Promise<RegistryDataRecord | undefined> {
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

  async getTypeRecord (cid: CIDLike): Promise<RegistryTypeRecord | undefined> {
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

  async getResource<R extends RegistryRecord = RegistryRecord> (id: DXN): Promise<Resource<R> | undefined> {
    const cid = await this.resolveRecordCid(id);
    if (!cid) {
      return undefined;
    }

    const record = await this.getRecord(cid);
    if (!record) {
      return undefined;
    }

    return {
      id,
      record: record as R
    };
  }

  async getResources (query?: IQuery): Promise<Resource[]> {
    const [resources, domains] = await Promise.all([
      this.api.query.registry.resources.entries<Option<Multihash>>(),
      this.api.query.registry.domains.entries()
    ]);
    const result = await Promise.all(resources.map(async (resource): Promise<Resource | undefined> => {
      const name = resource[0].args[1].toString();
      const domainKey = new DomainKey(resource[0].args[0].toU8a());
      const domain = domains.find(([storageKey]) => storageKey.args[0].eq(resource[0].args[0]))![1].unwrap();
      const id = domain.name.isSome ? DXN.fromDomainName(domain.name.unwrap().toString(), name) : DXN.fromDomainKey(domainKey, name);

      const cid = CID.from(resource[1].unwrap().toU8a());

      try {
        const registryRecord = await this.getRecord(cid);

        if (!registryRecord) {
          throw new Error('Registry corrupted.');
        }

        return {
          id,
          record: registryRecord
        };
      } catch (err) {
        return undefined;
      }
    }));

    return result.filter(isNotNullOrUndefined).filter(resource => Filtering.matchResource(resource, query));
  }

  async insertRawRecord (data: Uint8Array): Promise<CID> {
    const events = await this.transactionsHandler.sendTransaction(this.api.tx.registry.addRecord(compactAddLength(data)));
    const event = events.map(e => e.event).find(this.api.events.registry.RecordAdded.is);
    assert(event && this.api.events.registry.RecordAdded.is(event));
    return new CID(event.data[1].toU8a());
  }

  async insertDataRecord (data: unknown, typeId: CIDLike, meta: SuppliedRecordMetadata = {}): Promise<CID> {
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

  async registerResource (key: DomainKey, resourceName: string, contentCid: CID): Promise<void> {
    await this.transactionsHandler.sendTransaction(
      this.api.tx.registry.registerResource(key.value, resourceName, contentCid.value));
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

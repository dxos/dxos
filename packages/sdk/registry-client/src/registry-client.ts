//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import protobuf from 'protobufjs';

import { raise } from '@dxos/debug';
import { ComplexMap } from '@dxos/util';

import { decodeExtensionPayload, decodeProtobuf, encodeExtensionPayload, encodeProtobuf, sanitizeExtensionData } from './encoding';
import { Record as RawRecord } from './proto';
import { Filtering, Query } from './queries';
import { RegistryClientBackend } from './registry-client-backend';
import {
  CID, Domain, DomainKey,
  AccountKey,
  DXN,
  Resource,
  SuppliedRecordMetadata,
  SuppliedTypeRecordMetadata,
  RegistryType,
  ResourceRecord,
  RegistryRecord
} from './types';

/**
 * Main API for DXNS registry.
 */
export class RegistryClient {
  private readonly _recordCache = new ComplexMap<CID, Promise<RegistryRecord | undefined>>(cid => cid.toB58String())
  private readonly _typeCache = new ComplexMap<CID, Promise<RegistryType | undefined>>(cid => cid.toB58String())

  constructor (
    private readonly _backend: RegistryClientBackend
  ) {}

  //
  // Domains
  //

  /**
   * Resolves a domain key from the domain name.
   * @param domainName Name of the domain.
   */
  async getDomainKey (domainName: string): Promise<DomainKey> {
    return this._backend.getDomainKey(domainName);
  }

  /**
   * Returns a list of domains created in DXOS system.
   */
  async getDomains (): Promise<Domain[]> {
    return this._backend.getDomains();
  }

  /**
   * Creates a new domain in the system under a generated name.
   * @param account DXNS account that will own the domain.
   */
  async registerDomainKey (account: AccountKey): Promise<DomainKey> {
    return this._backend.registerDomainKey(account);
  }

  //
  // Resources
  //

  /**
   * Gets resource by its registered name.
   * @param name DXN of the resource used for registration.
   */
  async getResource (name: DXN): Promise<Resource | undefined> {
    return this._backend.getResource(name);
  }

  /**
   * Queries resources registered in the system.
   * @param query Query that each returned record must meet.
   */
  async getResources (query?: Query): Promise<Resource[]> {
    const resources = await this._backend.getResources();

    return resources.filter(resource => Filtering.matchResource(resource, query));
  }

  /**
   * Registers or updates a resource in the system.
   * Undefined CID means that the resource will be deleted.
   * @param name Identifies the domain and name of the resource.
   * @param cid CID of the record to be referenced with the given name.
   * @param owner DXNS account that will own the resource.
   * @param tag Tag for the resource.
   */
  async registerResource (
    name: DXN,
    cid: CID | undefined,
    owner: AccountKey,
    tag = 'latest'
  ): Promise<void> {
    return this._backend.registerResource(name, cid, owner, tag);
  }

  //
  // Records
  //

  /**
   * Gets record details by CID.
   * @param cid CID of the record.
   */
  async getRecord (cid: CID): Promise<RegistryRecord | undefined> {
    if (this._recordCache.has(cid)) {
      return this._recordCache.get(cid);
    }

    const recordPromise = this._fetchRecord(cid);
    this._recordCache.set(cid, recordPromise);

    return recordPromise;
  }

  /**
   * Gets resource by its registered name.
   * @param name DXN of the resource used for registration.
   * @param tag Tag to get the resource by. 'latest' by default.
   */
  // TODO(wittjosiah): Move tag into DXN.
  async getResourceRecord<R extends RegistryRecord> (name: DXN, tag = 'latest'): Promise<ResourceRecord<R> | undefined> {
    const resource = await this.getResource(name);
    if (!resource) {
      return undefined;
    }

    const cid = resource.tags[tag];
    if (!cid) {
      return undefined;
    }

    const record = await this.getRecord(cid);
    if (record === undefined) {
      return undefined;
    }

    return {
      resource,
      tag: resource.tags[tag] ? tag : undefined,
      record: record as R
    };
  }

  /**
   * Queries all records in the system.
   * @param query Query that each returned record must meet.
   */
  async getRecords (query?: Query): Promise<RawRecord[]> {
    const records = await this._backend.getRecords();

    return records.filter(record => Filtering.matchRecord(record, query));
  }

  /**
   * Creates a new data record in the system.
   * @param data Payload data of the record.
   * @param typeId CID of the type record that holds the schema of the data.
   * @param meta Record metadata information.
   */
  async registerRecord (data: unknown, typeId: CID, meta: SuppliedRecordMetadata = {}): Promise<CID> {
    const type = await this.getTypeRecord(typeId);
    assert(type);

    const record = {
      ...meta,
      created: new Date(),
      payload: await encodeExtensionPayload(sanitizeExtensionData(data, CID.from(typeId)),
        async cid => (await this.getTypeRecord(cid)) ?? raise(new Error(`Type not found: ${cid}`)))
    };

    return this._backend.registerRecord(record);
  }

  /**
   * Gets type records details by CID.
   * @param cid CID of the record.
   */
  async getTypeRecord (cid: CID): Promise<RegistryType | undefined> {
    if (this._typeCache.has(cid)) {
      return this._typeCache.get(cid);
    }

    const typePromise = this._fetchType(cid);
    this._typeCache.set(cid, typePromise);

    return typePromise;
  }

  /**
   * Queries type records.
   * @param query Query that each returned record must meet.
   */
  async getTypeRecords (query?: Query): Promise<RegistryType[]> {
    const records = await this._backend.getRecords();

    const types = records
      .filter(record => !!record.type)
      .filter(type => Filtering.matchRecord(type, query))
      .map(record => this._decodeType(record));

    return types;
  }

  /**
   * Creates a new type record in the system.
   * @param schema Protobuf schema of the type.
   * @param messageFqn Fully qualified name of the message. It must reside in the schema definition.
   * @param meta Record metadata information.
   */
  async registerTypeRecord (schema: protobuf.Root, messageName: string, meta: SuppliedTypeRecordMetadata = {}) {
    // Make sure message type exists.
    schema.lookupType(messageName);

    const record = {
      ...meta,
      created: new Date(),
      type: {
        protobufDefs: encodeProtobuf(schema),
        messageName,
        protobufIpfsCid: meta.sourceIpfsCid
      }
    };

    return this._backend.registerRecord(record);
  }

  private async _fetchRecord (cid: CID): Promise<RegistryRecord | undefined> {
    const rawRecord = await this._backend.getRecord(cid);
    const record = rawRecord && await this._decodeRecord(rawRecord);
    return record;
  }

  private async _decodeRecord (rawRecord: RawRecord): Promise<RegistryRecord> {
    const payload = rawRecord?.payload && await decodeExtensionPayload(rawRecord.payload, async (cid: CID) =>
      await this.getTypeRecord(cid) ?? raise(new Error(`Type not found: ${cid}`))
    );

    if (!payload) {
      throw new Error('Record payload is not valid');
    }

    return {
      ...rawRecord,
      payload
    };
  }

  private async _fetchType (cid: CID): Promise<RegistryType | undefined> {
    const record = await this._backend.getRecord(cid);
    if (!record) {
      return undefined;
    }

    return this._decodeType(record);
  }

  private _decodeType (rawRecord: RawRecord): RegistryType {
    if (!rawRecord.type) {
      throw new Error('Invalid type');
    }

    const { messageName, protobufDefs, protobufIpfsCid } = rawRecord.type;
    assert(messageName);
    assert(protobufDefs);

    return {
      ...rawRecord,
      type: {
        messageName,
        protobufDefs: decodeProtobuf(protobufDefs),
        protobufIpfsCid: protobufIpfsCid ? CID.from(protobufIpfsCid) : undefined
      }
    };
  }
}

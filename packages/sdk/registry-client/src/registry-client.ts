//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import protobuf from 'protobufjs';

import { raise } from '@dxos/debug';
import { ComplexMap } from '@dxos/util';

import { decodeProtobuf, encodeExtensionPayload, encodeProtobuf, sanitizeExtensionData } from './encoding';
import { Record as DXNSRecord } from './proto';
import { Filtering, IQuery } from './queries';
import { RegistryClientBackend } from './registry-client-backend';
import {
  CID, Domain, DomainKey,
  AccountKey,
  DXN,
  Resource,
  SuppliedRecordMetadata,
  SuppliedTypeRecordMetadata,
  RegistryType,
  ResourceRecord
} from './types';

/**
 * Main API for DXNS registry.
 */
export class RegistryClient {
  private readonly _recordCache = new ComplexMap<CID, Promise<DXNSRecord | undefined>>(cid => cid.toB58String())

  constructor (
    private readonly _backend: RegistryClientBackend
  ) {}

  //
  // Domains
  //

  async getDomainKey (domain: string): Promise<DomainKey> {
    return this._backend.getDomainKey(domain);
  }

  async getDomains (): Promise<Domain[]> {
    return this._backend.getDomains();
  }

  async createDomain (account: AccountKey): Promise<DomainKey> {
    return this._backend.createDomain(account);
  }

  //
  // Resources
  //

  async getResource (name: DXN): Promise<Resource | undefined> {
    return this._backend.getResource(name);
  }

  async getResources (query?: IQuery): Promise<Resource[]> {
    const resources = await this._backend.getResources();

    return resources.filter(resource => Filtering.matchResource(resource, query));
  }

  async setResource (
    name: DXN,
    tag = 'latest',
    cid: CID | undefined,
    account: AccountKey
  ): Promise<void> {
    return this._backend.setResource(name, tag, cid, account);
  }

  //
  // Records
  //

  async getRecord (cid: CID): Promise<DXNSRecord | undefined> {
    if (this._recordCache.has(cid)) {
      return this._recordCache.get(cid);
    }

    const recordPromise = this._backend.getRecord(cid);
    this._recordCache.set(cid, recordPromise);

    return recordPromise;
  }

  // TODO(wittjosiah): Move tag into DXN.
  async getResourceRecord (name: DXN, tag = 'latest'): Promise<ResourceRecord | undefined> {
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
      record: record
    };
  }

  async getRecords (query?: IQuery): Promise<DXNSRecord[]> {
    const records = await this._backend.getRecords();

    return records.filter(record => Filtering.matchRecord(record, query));
  }

  async createRecord (data: unknown, typeId: CID, meta: SuppliedRecordMetadata = {}): Promise<CID> {
    const type = await this.getTypeRecord(typeId);
    assert(type);

    const record = {
      ...meta,
      created: new Date(),
      payload: await encodeExtensionPayload(sanitizeExtensionData(data, CID.from(typeId)),
        async cid => (await this.getTypeRecord(cid)) ?? raise(new Error(`Type not found: ${cid}`)))
    };

    return this._backend.createRecord(record);
  }

  async getTypeRecord (cid: CID): Promise<RegistryType | undefined> {
    const record = await this.getRecord(cid);
    if (!record) {
      return undefined;
    }

    if (!record.type) {
      throw new Error('Record is not a type');
    }

    return this._decodeType(record);
  }

  async getTypeRecords (query?: IQuery): Promise<RegistryType[]> {
    const records = await this._backend.getRecords();

    const types = records
      .filter(record => !!record.type)
      .filter(type => Filtering.matchRecord(type, query))
      .map(record => this._decodeType(record));

    return types;
  }

  async createType (schema: protobuf.Root, messageName: string, meta: SuppliedTypeRecordMetadata = {}) {
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

    return this._backend.createRecord(record);
  }

  private _decodeType (record: DXNSRecord): RegistryType {
    if (record.type) {
      assert(record.type.protobufDefs);
      assert(record.type.messageName);

      return {
        messageName: record.type.messageName,
        protobufDefs: decodeProtobuf(record.type.protobufDefs),
        created: (record.created && !isNaN(record.created.getTime())) ? record.created : undefined,
        sourceIpfsCid: record.type.protobufIpfsCid
      };
    } else {
      throw new Error('Invalid type');
    }
  }
}

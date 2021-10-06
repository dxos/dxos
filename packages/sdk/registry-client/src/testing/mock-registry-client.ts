//
// Copyright 2021 DXOS.org
//

import { Root } from 'protobufjs';

import { DXN } from '../dxn';
import { CID, CIDLike, DomainKey } from '../models';
import { IQuery, Filtering } from '../querying';
import {
  DomainInfo,
  IRegistryClient,
  RecordMetadata,
  RegistryDataRecord,
  RegistryRecord,
  RegistryTypeRecord,
  Resource
} from '../registry-client';
import { createMockResources, createMockTypes } from './fake-data-generator';

export class MemoryRegistryClient implements IRegistryClient {
  constructor (
    private types: RegistryTypeRecord[] = createMockTypes(),
    private resources: Resource[] = createMockResources()
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addRecord (data: unknown, schemaId: CIDLike, messageFqn: string): Promise<CID> {
    return undefined as unknown as CID;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getResource<R extends RegistryRecord = RegistryRecord> (id: DXN): Promise<Resource<R> | undefined> {
    const resources = this.resources as unknown as Resource<R>[];
    return resources.find(resource => resource.id.toString() === id.toString());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDomains (): Promise<DomainInfo[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getRecord<R extends RegistryRecord = RegistryRecord> (cidLike: CIDLike): Promise<R | undefined> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getRecords<R extends RegistryRecord = RegistryRecord> (query?: IQuery): Promise<R[]> {
    return [];
  }

  async getResources<R extends RegistryRecord = RegistryRecord> (query?: IQuery): Promise<Resource<R>[]> {
    let result = this.resources as unknown as Resource<R>[];
    result = result.filter(resource => Filtering.matchResource(resource, query));
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async registerDomain (): Promise<DomainKey> {
    return undefined as unknown as DomainKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async registerResource (domainKey: DomainKey, resourceName: string, contentCid: CID): Promise<void> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveRecordCid (id: DXN): Promise<CID | undefined> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveDomainName (domainName: string): Promise<DomainKey> {
    return undefined as unknown as DomainKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTypeRecords (query?: IQuery): Promise<RegistryTypeRecord[]> {
    return this.types.filter(type => Filtering.matchRecord(type, query));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async insertDataRecord (data: unknown, typeId: CIDLike, meta?: RecordMetadata): Promise<CID> {
    return undefined as unknown as CID;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async insertRawRecord (data: Uint8Array): Promise<CID> {
    return undefined as unknown as CID;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async insertTypeRecord (schema: Root, messageName: string, meta?: RecordMetadata): Promise<CID> {
    return undefined as unknown as CID;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDataRecord<T = any> (cid: CIDLike): Promise<RegistryDataRecord<T> | undefined> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTypeRecord (cid: CIDLike): Promise<RegistryTypeRecord | undefined> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDataRecords<T = any> (query?: IQuery): Promise<RegistryDataRecord[]> {
    return Promise.resolve([]);
  }

  async disconnect () {
    return Promise.resolve();
  }
}

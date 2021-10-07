//
// Copyright 2021 DXOS.org
//

import protobuf from 'protobufjs';
import { DXN } from './dxn';
import { RecordExtension } from './encoding';
import { Resource as BaseResource } from './interfaces';
import { CID, CIDLike, DomainKey } from './models';
import { IQuery } from './querying';



export interface DomainInfo {
  key: DomainKey,
  name?: string,
  owners: string[],
}

export interface Resource extends BaseResource {
  id: DXN
}

export interface ResourceWithRecord<R extends RegistryRecord = RegistryRecord> extends Resource {
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

export interface UpdateResourceOptions {
  version?: string,
  tags?: string[]
}

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
  getResource (dxn: DXN): Promise<Resource | undefined>

  /**
   * Gets resource by its registered name.
   * @param dxn Name of the resource used for registration.
   * @param tag Tag to get the resource by. 'latest' by default.
   */
  getResourceByTag<R extends RegistryRecord = RegistryRecord> (dxn: DXN, tag?: string): Promise<ResourceWithRecord<R> | undefined>

  /**
   * Queries resources registered in the system.
   * @param query Query that each returned record must meet.
   */
  queryResources (query?: IQuery): Promise<Resource[]>
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
   * Registers or updates a resource in the system.
   * @param domainKey Identifies the domain of the resource to be registered in.
   * @param resourceName Identifies the name of the resource.
   * @param contentCid CID of the record to be referenced with the given name.
   * @param opts Optional version and tags. Adds tag 'latest' and no version by default.
   * @param opts.version Valid semver.
   * @param opts.tags A list of tags.
   */
   updateResource (
     domainKey: DomainKey,
     resourceName: string,
     contentCid: CID,
     opts?: UpdateResourceOptions
  ): Promise<void>

  disconnect (): Promise<void>
}

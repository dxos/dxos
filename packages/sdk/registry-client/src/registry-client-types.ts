//
// Copyright 2021 DXOS.org
//

import protobuf from 'protobufjs';

import { IQuery } from './queries';
import {
  CID,
  Domain,
  DomainKey,
  AccountKey,
  DXN,
  RegistryRecord,
  RegistryType,
  Resource,
  ResourceRecord,
  SuppliedRecordMetadata,
  UpdateResourceOptions
} from './types';

/**
 * DXNS Registry read-only operations.
 */
export interface ReadOnlyRegistryClient {
  /**
   * Resolves a domain key from the domain name.
   * @param domainName Name of the domain.
   */
  getDomainKey (domainName: string): Promise<DomainKey>

  /**
   * Returns a list of domains created in DXOS system.
   */
  getDomains (): Promise<Domain[]>

  /**
   * Gets record details by CID.
   * @param cid CID of the record.
   */
  getRecord<T = any>(cid: CID): Promise<RegistryRecord<T> | undefined>

  /**
   * Queries all records in the system.
   * @param query Query that each returned record must meet.
   */
  getRecords<T = any>(query?: IQuery): Promise<RegistryRecord<T>[]>

  /**
   * Gets type records details by CID.
   * @param cid CID of the record.
   */
  getType(cid: CID): Promise<RegistryType | undefined>

  /**
   * Queries type records.
   * @param query Query that each returned record must meet.
   */
  getTypes(query?: IQuery): Promise<RegistryType[]>

  /**
   * Resolves a CID of a record or type registered under a resource described with DXN name.
   * @param dxn Name of the resource which CID has to be resolved.
   */
  getCID (dxn: DXN): Promise<CID | undefined>

  /**
   * Gets resource by its registered name.
   * @param dxn Name of the resource used for registration.
   */
  getResource (dxn: DXN): Promise<Resource | undefined>

  /**
   * Gets resource by its registered name.
   * @param dxn Name of the resource used for registration.
   * @param tagOrVersion Tag or version to get the resource by. 'latest' by default.
   */
  getResourceRecord<R extends RegistryRecord = RegistryRecord> (dxn: DXN, tagOrVersion: string): Promise<ResourceRecord<R> | undefined>

  /**
   * Queries resources registered in the system.
   * @param query Query that each returned record must meet.
   */
  getResources (query?: IQuery): Promise<Resource[]>
}

/**
 * DXNS Registry modification operations.
 */
export interface RegistryClient extends ReadOnlyRegistryClient {
  /**
   * Creates a new data record in the system.
   * @param data Payload data of the record.
   * @param typeCid CID of the type record that holds the schema of the data.
   * @param meta Record metadata information.
   */
  createRecord (data: unknown, typeCid: CID, meta?: SuppliedRecordMetadata): Promise<CID>

  /**
   * Creates a new type record in the system.
   * @param schema Protobuf schema of the type.
   * @param messageFqn Fully qualified name of the message. It must reside in the schema definition.
   * @param meta Record metadata information.
   */
  createType(schema: protobuf.Root, messageFqn: string, meta?: SuppliedRecordMetadata): Promise<CID>

  /**
   * Creates a new domain in the system under a generated name.
   * @param account DXNS account that will own the domain.
   */
  createDomain (account: AccountKey): Promise<DomainKey>

  /**
   * Registers or updates a resource in the system.
   * @param resource Identifies the domain and name of the resource.
   * @param contentCid CID of the record to be referenced with the given name.
   * @param opts Optional version and tags. Adds tag 'latest' and no version by default.
   * @param opts.version Valid semver.
   * @param opts.tags A list of tags.
   */
   updateResource (
     resource: DXN,
     account: AccountKey,
     contentCid: CID,
     opts?: UpdateResourceOptions
  ): Promise<void>

  /**
   * Deletes a resource in the system.
   * @param resource Identifies the domain and name of the resource.
   */
  deleteResource (resource: DXN, account: AccountKey): Promise<void>
}

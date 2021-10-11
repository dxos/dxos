//
// Copyright 2021 DXOS.org
//

import { DXN } from './../../dxn';
import { CID, DomainKey } from './../../models';
import { IQuery } from './../../querying';
import { Domain, RegistryRecord, RegistryDataRecord, RegistryTypeRecord, Resource, ResourceRecord } from './types';

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
  getDomains (): Promise<Domain[]>

  /**
   * Gets record details by CID.
   * @param cid CID of the record.
   */
  getRecord(cid: CID): Promise<RegistryRecord | undefined>

  /**
   * Queries all records in the system.
   * @param query Query that each returned record must meet.
   */
  getRecords(query?: IQuery): Promise<RegistryRecord[]>

  /**
   * Gets data record details by CID.
   * @param cid CID of the record.
   */
  getDataRecord<T = any>(cid: CID): Promise<RegistryDataRecord<T> | undefined>

  /**
   * Queries data records.
   * @param query Query that each returned record must meet.
   */
  getDataRecords<T = any>(query?: IQuery): Promise<RegistryDataRecord<T>[]>

  /**
   * Gets type records details by CID.
   * @param cid CID of the record.
   */
  getTypeRecord(cid: CID): Promise<RegistryTypeRecord | undefined>

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
   * @param tagOrVersion Tag or version to get the resource by. 'latest' by default.
   */
  getResourceRecord<R extends RegistryRecord = RegistryRecord> (dxn: DXN, tagOrVersion: string): Promise<ResourceRecord<R> | undefined>

  /**
   * Queries resources registered in the system.
   * @param query Query that each returned record must meet.
   */
  queryResources (query?: IQuery): Promise<Resource[]>
}

//
// Copyright 2021 DXOS.org
//

import { Record as RawRecord } from '../proto';
import { AccountKey } from './account-key';
import { CID } from './cid';
import { DomainKey } from './domain-key';
import { DXN } from './dxn';

/**
 * Domains are auctioned namespaces for records.
 */
export type Domain = {
  key: DomainKey
  name?: string
  owner: string
}

/**
 * Identifies a named record.
 */
export type Resource = {
  /**
   * Resource DXN.
   */
  name: DXN

  /**
   * Describe release channels.
   *
   * Examples: latest, alpha, beta, dev
   */
  tags: Record<string, CID | undefined>

  /**
   * Type of the underlying Records.
   * `undefined` if the Resource points to the type Record.
   */
  // TODO(wittjosiah): Needed?
  type?: CID
}

export type RecordWithCid = RawRecord & { cid: CID }

/**
 * Minimal API for DXNS registry client backend.
 */
// TODO(wittjosiah): Don't use DXN? Fully specify resource parts in backend?
export interface RegistryClientBackend {
  getDomainKey (domain: string): Promise<DomainKey>
  getDomains (): Promise<Domain[]>
  registerDomainKey (owner: AccountKey): Promise<DomainKey>
  getResource (name: DXN): Promise<Resource | undefined>
  getResources (): Promise<Resource[]>
  registerResource (
    name: DXN,
    cid: CID | undefined,
    owner: AccountKey,
    // TODO(wittjosiah): Will be removed once tags are integrated with DXN.
    tag: string
  ): Promise<void>
  getRecord (cid: CID): Promise<RecordWithCid | undefined>
  getRecords (): Promise<RecordWithCid[]>
  registerRecord (record: RawRecord): Promise<CID>
}

//
// Copyright 2021 DXOS.org
//

import { Record as RawRecord } from '@dxos/protocols/dist/src/proto/gen/dxos/registry.js'; // Hack until we can set "moduleResolution": "nodenext" in tsconfig.json.

import { AccountKey } from './account-key.js';
import { CID } from './cid.js';
import { DomainKey } from './domain-key.js';
import { DXN } from './dxn.js';

/**
 * Authorities provide namespaces for records.
 * Domain names for authorities are auctioned.
 */
export type Authority = {
  key: DomainKey
  domainName?: string
  owner: string
}

export type RecordWithCid = RawRecord & { cid: CID }

/**
 * Minimal API for DXNS registry client backend.
 */
export interface RegistryClientBackend {
  getDomainKey (domain: string): Promise<DomainKey>
  listAuthorities (): Promise<Authority[]>
  registerAuthority (owner: AccountKey): Promise<DomainKey>
  getResource (name: DXN): Promise<CID | undefined>
  listResources (): Promise<[DXN, CID][]>
  registerResource (
    name: DXN,
    cid: CID | undefined,
    owner: AccountKey
  ): Promise<void>
  getRecord (cid: CID): Promise<RecordWithCid | undefined>
  listRecords (): Promise<RecordWithCid[]>
  registerRecord (record: RawRecord): Promise<CID>
}

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

import { raise } from '@dxos/debug';
import { ComplexMap } from '@dxos/util';

import { ApiTransactionHandler } from './api';
import { SignTxFunction } from './api/api-transaction-handler';
import {
  decodeExtensionPayload, decodeProtobuf, encodeExtensionPayload, encodeProtobuf, sanitizeExtensionData
} from './encoding';
import { DomainKey as BaseDomainKey, Multihash, Resource as BaseResource } from './interfaces';
import { schema as dxnsSchema } from './proto';
import { Filtering, IQuery } from './queries';
import { IRegistryClient } from './registry-client-types';
import {
  CID, Domain, DomainKey,
  DXN, RecordKind,
  RecordMetadata,
  RegistryDataRecord,
  RegistryRecord,
  RegistryTypeRecord,
  Resource,
  ResourceRecord,
  SuppliedRecordMetadata,
  SuppliedTypeRecordMetadata,
  TypeRecordMetadata,
  UpdateResourceOptions
} from './types';
import { BaseClient } from './base-client';

/**
 * Main API for DXNS account and devices management.
 */
export class AccountClient extends BaseClient {
  /**
   * Creates a DXNS account on the blockchain.
   */
  async createAccount (): Promise<string> {
    
  }
  
  /**
   * Add a new device to an existing DXNS account.
   */
  async addDeviceToAccount (account: string, device: string): Promise<void> {

  }
}

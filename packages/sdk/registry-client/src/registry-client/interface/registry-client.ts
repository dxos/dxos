//
// Copyright 2021 DXOS.org
//

import protobuf from 'protobufjs';

import { CID, CIDLike, DomainKey } from '../../models';
import { IReadOnlyRegistryClient } from './readonly-registry-client';
import { SuppliedRecordMetadata, UpdateResourceOptions } from './types';

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

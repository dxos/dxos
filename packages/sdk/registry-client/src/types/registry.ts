//
// Copyright 2021 DXOS.org
//

import protobuf from 'protobufjs';

import { RecordExtension } from '..';
import { Record as RawRecord } from '../proto';
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

export type RegistryRecord<T = any> = Omit<RawRecord, 'payload' | 'type'> & {
  cid: CID,
  payload: RecordExtension<T>
}

export type RegistryType = Omit<RawRecord, 'payload' | 'type'> & {
  cid: CID,
  type: {
    /**
     * FQN of the root message in the protobuf definitions.
     * NOTE: Should not be used to name this type.
     */
    messageName: string
    protobufDefs: protobuf.Root
    protobufIpfsCid?: CID
  }
}

/**
 * Specific binding of Resource tag to a corresponding Record.
 */
// TODO(wittjosiah): Replace with tuple (resource, record) once dxn/resource includes tags.
export interface ResourceRecord<R extends RegistryRecord> {
  /**
   * Resource that points to this Record.
   */
  resource: Resource

  /**
   * Specific tag of the fetched Record.
   */
  tag?: string

  /**
   * Record data.
   */
  record: R
}

// TODO(wittjosiah): Simplify metadata types.

/**
 * Automatically generated Record metadata.
 */
export interface InferredRecordMetadata {
  created?: Date
}

/**
 * Record metadata provided by the user.
 */
export interface SuppliedRecordMetadata {
  tags?: string[]
  displayName?: string
  description?: string
}

export type RecordMetadata = InferredRecordMetadata & SuppliedRecordMetadata

export interface SuppliedTypeRecordMetadata extends SuppliedRecordMetadata {
  sourceIpfsCid?: string
}

export type TypeRecordMetadata = InferredRecordMetadata & SuppliedTypeRecordMetadata

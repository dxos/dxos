//
// Copyright 2021 DXOS.org
//

import protobuf from 'protobufjs';

import { RecordExtension } from '../../encoding';
import { CID, DomainKey, DXN } from '../../models';

export interface Domain {
  key: DomainKey,
  name?: string,
  owners: string[],
}

/**
 * Identifies a named (and optionally versioned) record.
 */
export interface Resource {
  /**
   * Resource DXN.
   */
  id: DXN

  /**
   * **semver 2.0** compliant record versions.
   * Should conform to the semver regex (see https://semver.org/).
   *
   * Examples: 1.0.0, 1.0.0-alpha, 1.0.0-alpha.1, 1.0.0-0.3.7, 1.0.0-x.7.z.92, 1.0.0-x-y-z.–
   */
  versions: Record<string, CID | undefined>

  /**
   * Describe release channels.
   *
   * Examples: latest, alpha, beta, dev
   */
  tags: Record<string, CID | undefined>

  /**
   * Type of the underlying Records. `undefined` if the Resource points to the type Record.
   */
  type?: CID
}

/**
 * Specific binding of Resource tag or version to a corresponding Record.
 */
export interface ResourceRecord<R extends RegistryRecord = RegistryRecord> {
  /**
   * Resource that points to this Record.
   */
  resource: Resource

  /**
   * Specific version of the fetched Record.
   */
  version?: string

  /**
   * Specific tag of the fetched Record.
   */
  tag?: string

  /**
   * Record data.
   */
  record: R
}

/**
 * Automatically generated Record metadata.
 */
export interface InferredRecordMetadata {
  created?: Date;
}

/**
 * Record metadata provided by the user.
 */
export interface SuppliedRecordMetadata {
  description?: string;
}

export type RecordMetadata = InferredRecordMetadata & SuppliedRecordMetadata

export interface TypeRecordMetadata extends SuppliedRecordMetadata {
  sourceIpfsCid?: string
}

export enum RecordKind {
  Type = 'TYPE',
  Data = 'DATA'
}

/**
 * Base fields for all Record variants.
 */
export interface RegistryRecordBase {
  kind: RecordKind
  cid: CID
  meta: RecordMetadata
}

/**
 * Types are system Records that define protocol-buffer schema of other Records.
 */
export interface RegistryTypeRecord extends RegistryRecordBase {
  kind: RecordKind.Type

  /**
   * FQN of the root message in the protobuf definitions.
   *
   * NOTE: Should not be used to name this type.
   */
  messageName: string
  protobufDefs: protobuf.Root
}

/**
 * Data with a reference to a type record that defines the encoding.
 */
export interface RegistryDataRecord<T = any> extends RegistryRecordBase {
  kind: RecordKind.Data
  type: CID
  dataSize: number
  dataRaw: Uint8Array
  data: RecordExtension<T>
}

export type RegistryRecord = RegistryTypeRecord | RegistryDataRecord

export const RegistryRecord = {
  isTypeRecord: (x: RegistryRecord): x is RegistryTypeRecord => x.kind === RecordKind.Type,
  isDataRecord: (x: RegistryRecord): x is RegistryDataRecord => x.kind === RecordKind.Data
};

export interface UpdateResourceOptions {
  version?: string
  tags?: string[]
}

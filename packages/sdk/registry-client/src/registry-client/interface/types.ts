//
// Copyright 2021 DXOS.org
//

import protobuf from 'protobufjs';

import { DXN } from '../../dxn';
import { RecordExtension } from '../../encoding';
import { CID, DomainKey } from '../../models';

export interface DomainInfo {
  key: DomainKey,
  name?: string,
  owners: string[],
}

export interface Resource {
  id: DXN
  versions: Record<string, CID | undefined>
  tags: Record<string, CID | undefined>
  /**
   * Type of the underlying records. `undefined` if the resource points to the type record.
   */
  type?: CID
}

// TODO(dmaretskyi): Think about a better name.
export interface ResourceRecord<R extends RegistryRecord = RegistryRecord> extends Resource {
  version?: string
  tag?: string
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

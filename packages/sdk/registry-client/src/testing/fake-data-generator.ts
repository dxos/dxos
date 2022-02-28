//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import * as protobuf from 'protobufjs';

import { sanitizeExtensionData } from '../encoding';
import { schemaJson } from '../proto';
import { CID, DXN, RecordKind, RegistryDataRecord, RegistryTypeRecord, ResourceRecord, TypeRecordMetadata } from '../types';

const defs = protobuf.Root.fromJSON(schemaJson);

/**
 * Generates a random CID.
 */
export const createCID = (): CID => {
  return CID.from(Uint8Array.from(Array.from({ length: 34 }).map(() => Math.floor(Math.random() * 255))));
};

/**
 * Generates a random DXN.
 *
 * Accepts a custom domain, uses 'example' by default.
 */
export const createDxn = (domain = 'example'): DXN => {
  return DXN.fromDomainName(domain, faker.internet.domainWord());
};

export const mockTypeNames = [
  {
    type: '.dxos.type.KUBE',
    label: 'KUBE'
  },
  {
    type: '.dxos.type.Service',
    label: 'KUBE Service'
  },
  {
    type: '.dxos.type.IPFS',
    label: 'IPFS service'
  },
  {
    type: '.dxos.type.File',
    label: 'File'
  },
  {
    type: '.dxos.type.App',
    label: 'App'
  },
  {
    type: '.dxos.type.Bot',
    label: 'Bot'
  }
];

const mockTypes = mockTypeNames.map((item): RegistryTypeRecord => ({
  cid: createCID(),
  kind: RecordKind.Type,
  meta: {
    created: faker.date.recent(30)
  },
  messageName: item.type,
  protobufDefs: defs
}));

/**
 * Generates a static list of predefined type records.
 */
export const createMockTypes = () => mockTypes;

export interface CreateMockResourceRecordOptions {
  dxn?: DXN
  type?: string
  meta?: TypeRecordMetadata
  data?: any
}

/**
 * Generates a single resource record, optionally generating a random name and type if none are provided.
 *
 * Allows record data and meta to be provided, otherwise are left empty.
 */
export const createMockResourceRecord = ({
  dxn,
  type: typeName,
  meta = {},
  data = {}
} : CreateMockResourceRecordOptions = {}): ResourceRecord => {
  const type =
    mockTypes.find(type => type.messageName === typeName) ?? faker.random.arrayElement(mockTypes);

  const record: RegistryDataRecord = {
    kind: RecordKind.Data,
    cid: createCID(),
    type: type.cid,
    meta,
    dataSize: 0,
    dataRaw: new Uint8Array(),
    data: sanitizeExtensionData(data, type.cid)
  };

  return {
    resource: {
      id: dxn ?? createDxn(),
      tags: {
        latest: record.cid
      },
      versions: {},
      type: type.cid
    },
    record: record
  };
};

/**
 * Generates a single empty record with a random type.
 */
export const createMockRecord = (): RegistryDataRecord => {
  const type = faker.random.arrayElement(mockTypes);

  return {
    kind: RecordKind.Data,
    cid: createCID(),
    type: type.cid,
    meta: {},
    dataSize: 0,
    dataRaw: new Uint8Array(),
    data: sanitizeExtensionData({}, type.cid)
  };
};

/**
 * Generates a list of resource records with random types.
 */
export const createMockResourceRecords = () => Array.from({ length: 30 }).map(() => createMockResourceRecord());

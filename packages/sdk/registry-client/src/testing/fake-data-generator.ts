//
// Copyright 2021 DXOS.org
//

import faker from 'faker';

import { Record as RawRecord, schemaJson } from '../proto';
import { CID, DXN, RecordMetadata, Resource } from '../types';

/**
 * Generates a random CID.
 */
export const createCID = (): CID => {
  return CID.from(Uint8Array.from(Array.from({ length: 34 }).map(() => Math.floor(Math.random() * 255))));
};

/**
 * Generates a random DXN.
 * Accepts a custom domain, uses 'example' by default.
 */
export const createDXN = (domain = 'example'): DXN => {
  return DXN.fromDomainName(domain, faker.lorem.words(3).split(' ').join('-'));
};

/**
 * Generates a single resource, optionally generating a random name and type if none are provided.
 */
export const createMockResource = (name: DXN, record: CID): Resource => {
  const resource = {
    name: name ?? createDXN(), // TODO(burdon): Either pass in or don't.
    tags: {
      latest: record
    }
  };

  return resource;
};

/**
 * Generates a single random record.
 */
export const createMockRecord = (
  typeRecord: CID,
  meta?: RecordMetadata,
  data?: Uint8Array
): RawRecord => {
  return {
    created: meta?.created ?? faker.date.recent(30),
    displayName: meta?.displayName ?? faker.lorem.words(3),
    description: meta?.description ?? faker.lorem.sentence(),
    tags: meta?.tags ?? faker.lorem.words(3).split(' '),
    payload: {
      typeRecord: typeRecord.value,
      data: data ?? new Uint8Array()
    }
  };
};

export const mockTypeMessageNames = [
  '.dxos.type.App',
  '.dxos.type.Bot',
  '.dxos.type.File',
  '.dxos.type.IPFS',
  '.dxos.type.KUBE',
  '.dxos.type.Service'
];

/**
 * Generates a single random type record.
 */
export const createMockTypeRecord = (
  meta?: RecordMetadata,
  type?: RawRecord.Type
): RawRecord => {
  return {
    created: meta?.created ?? faker.date.recent(30),
    displayName: meta?.displayName ?? faker.lorem.words(3),
    description: meta?.description ?? faker.lorem.sentence(),
    tags: meta?.tags ?? faker.lorem.words(3).split(' '),
    type: type ?? {
      messageName: faker.random.arrayElement(mockTypeMessageNames),
      protobufDefs: JSON.stringify(schemaJson)
    }
  };
};

/**
 * Generates a static list of predefined type records.
 */
export const createMockTypes = () => mockTypeMessageNames.map(messageName =>
  createMockTypeRecord({}, { messageName, protobufDefs: JSON.stringify(schemaJson) })
);

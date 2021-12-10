//
// Copyright 2021 DXOS.org
//

import * as protobuf from 'protobufjs';

import {
  CID,
  DXN,
  MemoryRegistryClient,
  RecordKind,
  RegistryDataRecord,
  RegistryTypeRecord,
  ResourceRecord
} from '@dxos/registry-client';

const createCID = (): CID => {
  return CID.from(Uint8Array.from(Array.from({ length: 34 }).map(() => Math.floor(Math.random() * 255))));
};

const Bot

const createMockResource = (name: string, cid: CID, typeCid: CID, payload: any): ResourceRecord => {
  const dxn = DXN.parse(name);

  if (isType) {
    const record: RegistryTypeRecord = {
      kind: RecordKind.Type,
      cid: cid,
      meta: { description: dxn.resource },
      messageName: 'Bots type',
      protobufDefs: new protobuf.Root()
    };
  
    return {
      resource: { id: dxn, versions: {}, tags: { latest: record.cid } },
      record: record
    };
  } else {
    const record: RegistryDataRecord = {
      kind: RecordKind.Data,
      cid: cid,
      type: typeCid,
      meta: { description: dxn.resource },
      dataSize: 0,
      dataRaw: new Uint8Array(),
      data: {
        '@type': typeCid,
        ...payload
      }
    };
  
    return {
      resource: { id: dxn, versions: {}, tags: { latest: record.cid } },
      record: record
    };
  }
};

const botTypeCID = createCID();

export const createMockRegistry = () => {
  const types: Array<RegistryTypeRecord> = [
    {
      cid: botTypeCID,
      kind: RecordKind.Type,
      meta: {
        created: new Date(),
        description: 'Bot'
      },
      messageName: 'bot',
      protobufDefs: new protobuf.Root()
    }
  ];

  const resources = [
    {
      name: 'dxos:type.bot',
      cid: botTypeCID,
      typeCID: createCID(),
      kind: RecordKind.Type,
      payload: {}
    },
    {
      name: 'bot:bot',
      cid: createCID(),
      typeCID: botTypeCID,
      payload: {
        repository: './stories/bots/start-story-bot'
      }
    }
  ].map((item) => createMockResource(item.name, item.cid, item.typeCID, item.payload));

  return new MemoryRegistryClient(types, resources);
};

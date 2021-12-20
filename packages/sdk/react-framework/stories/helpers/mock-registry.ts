//
// Copyright 2021 DXOS.org
//

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

const createMockResource = (name: string, typeCid: CID): ResourceRecord => {
  const dxn = DXN.parse(name);

  const record: RegistryDataRecord = {
    kind: RecordKind.Data,
    cid: createCID(),
    type: typeCid,
    meta: { description: dxn.resource },
    dataSize: 0,
    dataRaw: new Uint8Array(),
    data: {
      '@type': typeCid
    }
  };

  return {
    resource: { id: dxn, versions: {}, tags: { latest: record.cid } },
    record: record
  };
};

export const createMockRegistry = () => {
  const types: Array<RegistryTypeRecord> = [
    {
      cid: createCID(),
      kind: RecordKind.Type,
      meta: {
        created: new Date(),
        description: 'App'
      },
      messageName: 'app',
      protobufDefs: {} as any
    },
    {
      cid: createCID(),
      kind: RecordKind.Type,
      meta: {
        created: new Date(),
        description: 'Model'
      },
      messageName: 'model',
      protobufDefs: {} as any
    }
  ];

  const resources = [
    {
      name: 'example:frame.one',
      typeCid: types.find(type => type.messageName === 'app')!.cid
    },
    {
      name: 'example:frame.two',
      typeCid: types.find(type => type.messageName === 'app')!.cid
    },
    {
      name: 'example:frame.three',
      typeCid: types.find(type => type.messageName === 'app')!.cid
    },
    {
      name: 'example:app.todo',
      typeCid: types.find(type => type.messageName === 'app')!.cid
    },
    {
      name: 'example:model.one',
      typeCid: types.find(type => type.messageName === 'model')!.cid
    },
    {
      name: 'example:model.two',
      typeCid: types.find(type => type.messageName === 'model')!.cid
    },
    {
      name: 'example:model.three',
      typeCid: types.find(type => type.messageName === 'model')!.cid
    }
  ].map(item => createMockResource(item.name, item.typeCid));

  return new MemoryRegistryClient(types, resources);
};

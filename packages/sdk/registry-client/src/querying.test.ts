//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { createCID } from '.';
import { DXN } from './models';
import { Filtering } from './querying';
import { Resource, RegistryRecord, RegistryTypeRecord, RegistryDataRecord, RecordKind } from './registry-client';

describe('Registry API querying', () => {
  // TODO(marik-d): Fix those tests.
  describe('Resources filtering', () => {
    it('Filters by type, when equal, then filtered in', () => {
      // const data = [{ messageFqn: 'app' } as unknown as Resource, { mesageFqn: 'bot' } as unknown as Resource];
      // const actual = data.filter(item => Filtering.matchResource(item, { type: 'app' }));

      // expect(actual).to.have.length(1);
      // expect(actual[0].messageFqn).to.be.equal('app');
    });

    it('Filters by text, when contains text, then filtered in', () => {
      const data = [
        { id: DXN.fromDomainName('apps', 'super-app') } as unknown as Resource,
        { id: DXN.fromDomainName('bricks', 'redbrick') } as unknown as Resource
      ];
      const actual = data.filter(item => Filtering.matchResource(item, { text: 'red' }));

      expect(actual).to.have.length(1);
      expect(actual[0].id.toString()).to.be.equal('bricks:redbrick');
    });

    it('Filters by text, when contains text (case-insensitive), then filtered in', () => {
      const data = [
        { id: DXN.fromDomainName('apps', 'super-app') } as unknown as Resource,
        { id: DXN.fromDomainName('bricks', 'redbrick') } as unknown as Resource
      ];
      const actual = data.filter(item => Filtering.matchResource(item, { text: 'REd' }));

      expect(actual).to.have.length(1);
      expect(actual[0].id.toString()).to.be.equal('bricks:redbrick');
    });
  });

  describe('records filtering', () => {
    const appTypeCID = createCID();
    const botTypeCID = createCID();
    const typeRecords: RegistryTypeRecord[] = [
      { cid: appTypeCID, kind: RecordKind.Type, messageName: '.dxos.type.App', meta: { description: 'App' }, protobufDefs: null as any },
      { cid: botTypeCID, kind: RecordKind.Type, messageName: '.dxos.type.Bot', meta: { description: 'Bot' }, protobufDefs: null as any }
    ];
    const dataRecords: RegistryDataRecord[] = [
      { cid: createCID(), kind: RecordKind.Data, meta: { description: 'alphaApplication' }, type: appTypeCID, data: null as any, dataRaw: null as any, dataSize: null as any },
      { cid: createCID(), kind: RecordKind.Data, meta: { description: 'betaApplication' }, type: appTypeCID, data: null as any, dataRaw: null as any, dataSize: null as any },
      { cid: createCID(), kind: RecordKind.Data, meta: { description: 'alphaBotter' }, type: botTypeCID, data: null as any, dataRaw: null as any, dataSize: null as any }

    ];
    const records: RegistryRecord[] = [
      ...typeRecords,
      ...dataRecords
    ];

    it('Filters by type', () => {
      expect(records.filter(item => Filtering.matchRecord(item, { type: appTypeCID }))).to.have.length(2);
      expect(records.filter(item => Filtering.matchRecord(item, { type: botTypeCID }))).to.have.length(1);
      expect(records.filter(item => Filtering.matchRecord(item, { type: createCID() }))).to.have.length(0);
    });

    it('Filters by text', () => {
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'app' }))).to.have.length(3); // 2 Applications and App type
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'application' }))).to.have.length(2);
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'botter' }))).to.have.length(1);
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'ipfs' }))).to.have.length(0);
    });
  });
});

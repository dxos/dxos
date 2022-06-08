//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { Record as RawRecord } from './proto';
import { Filtering } from './queries';
import { createCID } from './testing';
import { DXN, Resource } from './types';

describe('Queries', () => {
  // TODO(marik-d): Fix those tests.
  describe('Resources filtering', () => {
    it('Filters by type, when equal, then filtered in', () => {
      // code const data = [{ messageFqn: 'app' } as unknown as Resource, { mesageFqn: 'bot' } as unknown as Resource];
      // code const actual = data.filter(item => Filtering.matchResource(item, { type: 'app' }));

      // code expect(actual).to.have.length(1);
      // code expect(actual[0].messageFqn).to.be.equal('app');
    });

    it('Filters by text, when contains text, then filtered in', () => {
      const data = [
        { name: DXN.fromDomainName('apps', 'super-app') } as unknown as Resource,
        { name: DXN.fromDomainName('bricks', 'redbrick') } as unknown as Resource
      ];
      const actual = data.filter(item => Filtering.matchResource(item, { text: 'red' }));

      expect(actual).to.have.length(1);
      expect(actual[0].name.toString()).to.be.equal('bricks:redbrick');
    });

    it('Filters by text, when contains text (case-insensitive), then filtered in', () => {
      const data = [
        { name: DXN.fromDomainName('apps', 'super-app') } as unknown as Resource,
        { name: DXN.fromDomainName('bricks', 'redbrick') } as unknown as Resource
      ];
      const actual = data.filter(item => Filtering.matchResource(item, { text: 'REd' }));

      expect(actual).to.have.length(1);
      expect(actual[0].name.toString()).to.be.equal('bricks:redbrick');
    });
  });

  describe('Records filtering', () => {
    const appTypeCID = createCID();
    const botTypeCID = createCID();
    const records: RawRecord[] = [
      {
        displayName: 'appType',
        type: {
          messageName: '.dxos.type.App',
          protobufDefs: null as any
        }
      },
      {
        displayName: 'botType',
        type: {
          messageName: '.dxos.type.Bot',
          protobufDefs: null as any
        }
      },
      {
        displayName: 'alphaApplication',
        payload: {
          typeRecord: appTypeCID.value
        }
      },
      {
        displayName: 'betaApplication',
        payload: {
          typeRecord: appTypeCID.value
        }
      },
      {
        displayName: 'alphaBotter',
        payload: {
          typeRecord: botTypeCID.value
        }
      }
    ];

    it('Filters by type', () => {
      expect(records.filter(item => Filtering.matchRecord(item, { type: appTypeCID }))).to.have.length(2);
      expect(records.filter(item => Filtering.matchRecord(item, { type: botTypeCID }))).to.have.length(1);
      expect(records.filter(item => Filtering.matchRecord(item, { type: createCID() }))).to.have.length(0);
    });

    it('Filters by text', () => {
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'app' }))).to.have.length(3); // 2 Applications and App type.
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'application' }))).to.have.length(2);
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'botter' }))).to.have.length(1);
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'ipfs' }))).to.have.length(0);
    });
  });
});

//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { createCID } from '../testing';
import { DXN } from './dxn';
import { Filtering } from './filtering';
import { RegistryRecord } from './registry-client';

describe('Filtering', function () {
  // TODO(marik-d): Fix those tests.
  describe('Resources filtering', function () {
    it('Filters by type, when equal, then filtered in', function () {
      // code const data = [{ messageFqn: 'app' } as unknown as Resource, { mesageFqn: 'bot' } as unknown as Resource];
      // code const actual = data.filter(item => Filtering.matchResource(item, { type: 'app' }));

      // code expect(actual).to.have.length(1);
      // code expect(actual[0].messageFqn).to.be.equal('app');
    });

    it('Filters by text, when contains text, then filtered in', function () {
      const data = [
        DXN.fromDomainName('apps', 'super-app'),
        DXN.fromDomainName('bricks', 'redbrick')
      ];
      const actual = data.filter(item => Filtering.matchResource(item, { text: 'red' }));

      expect(actual).to.have.length(1);
      expect(actual[0].toString()).to.be.equal('bricks:redbrick');
    });

    it('Filters by text, when contains text (case-insensitive), then filtered in', function () {
      const data = [
        DXN.fromDomainName('apps', 'super-app'),
        DXN.fromDomainName('bricks', 'redbrick')
      ];
      const actual = data.filter(item => Filtering.matchResource(item, { text: 'REd' }));

      expect(actual).to.have.length(1);
      expect(actual[0].toString()).to.be.equal('bricks:redbrick');
    });
  });

  describe('Records filtering', function () {
    const appTypeCID = createCID();
    const botTypeCID = createCID();
    // TODO(wittjosiah): Include types in filtering once they are no longer differentiated from data records.
    // const types: RegistryType[] = [
    //   {
    //     cid: appTypeCID,
    //     display_name: 'appType',
    //     type: {
    //       messageName: '.dxos.type.App',
    //       protobufDefs: null as any
    //     }
    //   },
    //   {
    //     cid: botTypeCID,
    //     display_name: 'botType',
    //     type: {
    //       messageName: '.dxos.type.Bot',
    //       protobufDefs: null as any
    //     }
    //   }
    // ];

    const records: RegistryRecord[] = [
      {
        cid: createCID(),
        displayName: 'alphaApplication',
        payload: {
          '@type': appTypeCID
        }
      },
      {
        cid: createCID(),
        displayName: 'betaApplication',
        payload: {
          '@type': appTypeCID
        }
      },
      {
        cid: createCID(),
        displayName: 'alphaBotter',
        payload: {
          '@type': botTypeCID
        }
      }
    ];

    it('Filters by type', function () {
      expect(records.filter(item => Filtering.matchRecord(item, { type: appTypeCID }))).to.have.length(2);
      expect(records.filter(item => Filtering.matchRecord(item, { type: botTypeCID }))).to.have.length(1);
      expect(records.filter(item => Filtering.matchRecord(item, { type: createCID() }))).to.have.length(0);
    });

    it('Filters by text', function () {
      // expect(records.filter(item => Filtering.matchRecord(item, { text: 'app' }))).to.have.length(3); // 2 Applications and App type.
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'application' }))).to.have.length(2);
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'botter' }))).to.have.length(1);
      expect(records.filter(item => Filtering.matchRecord(item, { text: 'ipfs' }))).to.have.length(0);
    });
  });
});

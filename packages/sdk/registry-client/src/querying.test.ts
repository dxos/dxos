//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { DXN } from './dxn';
import { Filtering } from './querying';
import { Resource } from './registry-client';

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
});

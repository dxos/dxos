//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Airports, fetchAirports } from './airports';

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('airports', () => {
  // eslint-disable-next-line mocha/no-skipped-tests
  test('parse airports', async () => {
    const airports = new Airports(await fetchAirports());
    expect(airports.airports).to.have.length.greaterThan(1);

    {
      const results = await airports.search('new york');
      expect(results).length(2);
    }
    {
      const results = await airports.search(undefined, { municipality: 'new york' });
      expect(results).length.greaterThan(1);
    }
    {
      const results = await airports.search('new', { country: 'US' });
      expect(results).length.greaterThan(1);
    }
  });
});

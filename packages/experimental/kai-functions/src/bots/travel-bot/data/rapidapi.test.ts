//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Config } from '@dxos/config';
import { beforeAll, describe, test } from '@dxos/test';

import { getKey, loadJson } from '../../util';

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('rapid API', () => {
  let config: Config;

  beforeAll(() => {
    config = new Config(loadJson(process.env.TEST_CONFIG!));
  });

  // TODO(burdon): Generalize Rapid API.
  // eslint-disable-next-line mocha/no-skipped-tests
  test.skip('rapid-api', async () => {
    // https://rapidapi.com/natkapral/api/countries-cities
    // TODO(burdon): Remove: free-tier but credit card on file.
    const service = {
      name: 'countries-cities',
      path: '/location/country/list',
    };

    const host = `https://${service.name}.p.rapidapi.com`;
    const { href: url } = new URL(service.path, host);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': getKey(config, 'com.rapidApi.api_key')!,
        'X-RapidAPI-Host': host,
      },
    });

    const data = await response.json();
    // console.log(Object.keys(data));
    expect(data).to.exist;
  });
});

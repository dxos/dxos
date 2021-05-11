//
// Copyright 2021 DXOS.org
//

import { Config, mapFromKeyValues, mapToKeyValues } from './config';
import envmap from './testing/env_map';
import defaults from './testing/test';

test('Empty config', () => {
  const config = new Config();

  expect(config.values).toBeTruthy();
  expect(config.get('client.id')).toBeUndefined();
});

test('Basic config', () => {
  const config = new Config({
    client: {
      tag: 'testing'
    }
  }, defaults);

  expect(config.values).toEqual({
    client: {
      id: 123,
      tag: 'testing'
    }
  });
});

test('Mapping', () => {
  process.env.TEST_CLIENT_ID = 900;
  process.env.TEST_SERVER_ENDPOINT = 'http://localhost';

  const config = new Config({
    client: {
      tag: 'testing'
    }
  }, mapFromKeyValues(envmap, process.env));

  expect(config.values).toEqual({
    client: {
      id: 900,
      tag: 'testing'
    },
    server: {
      endpoint: 'http://localhost'
    }
  });

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 900,
    TEST_CLIENT_TAG: 'testing',
    TEST_SERVER_ENDPOINT: 'http://localhost'
  });
});

test('mapToKeyValuesping', () => {
  const config = new Config({
    client: {
      tag: 'testing'
    }
  }, defaults);

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 123,
    TEST_CLIENT_TAG: 'testing'
  });
});

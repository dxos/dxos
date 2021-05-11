//
// Copyright 2020 DXOS.
//

import yaml from 'js-yaml';

import { Config, mapFromKeyValues, mapToKeyValues } from './config';

import defaults from './testing/test.yml';
import envmap from './testing/env_map.yml';

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
  }, yaml.load(defaults));

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
  }, mapFromKeyValues(yaml.load(envmap), process.env));

  expect(config.values).toEqual({
    client: {
      id: 900,
      tag: 'testing'
    },
    server: {
      endpoint: 'http://localhost'
    }
  });

  const values = mapToKeyValues(yaml.load(envmap), config.values);

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
  }, yaml.load(defaults));

  const values = mapToKeyValues(yaml.load(envmap), config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 123,
    TEST_CLIENT_TAG: 'testing'
  });
});

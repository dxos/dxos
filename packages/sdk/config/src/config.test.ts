//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Config, mapFromKeyValues, mapToKeyValues } from './config';
import envmap from './testing/env_map.json';
import defaults from './testing/test.json';
import { ConfigV1Object } from './types';

test('Empty config', () => {
  const config = new Config({});

  expect(config.values).toBeTruthy();
  expect(config.get('app.title')).toBeUndefined();
});

test('Basic config', () => {
  const config = new Config({
    app: {
      title: 'testing'
    }
  }, {
    app: {
      theme: 'light'
    }
  });

  expect(config.values).toEqual({
    app: {
      title: 'testing',
      theme: 'light'
    }
  });
});

test('Config v1', () => {
  const config = new Config<ConfigV1Object>({
    version: 1,
    module: {
      name: 'dxos:app.tasks',
      record: {
        app: {
          contentType: ['dxos:type.chess.board']
        }
      }
    }
  }, {
    runtime: {
      services: {
        signal: {
          server: 'ws://localhost:4000'
        }
      }
    }
  });

  expect(config.values).toEqual({
    version: 1,
    module: {
      name: 'dxos:app.tasks',
      record: {
        app: {
          contentType: ['dxos:type.chess.board']
        }
      }
    },
    runtime: {
      services: {
        signal: {
          server: 'ws://localhost:4000'
        }
      }
    }
  });
});

test('Mapping', () => {
  process.env.TEST_CLIENT_ID = '900';
  process.env.TEST_SERVER_ENDPOINT = 'http://localhost';

  const config = new Config({
    client: {
      tag: 'testing'
    }
  } as any, mapFromKeyValues(envmap, process.env));

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
  } as any, defaults as any);

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 123,
    TEST_CLIENT_TAG: 'testing'
  });
});

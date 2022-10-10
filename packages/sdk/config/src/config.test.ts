//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { Runtime } from '@dxos/protocols/proto/dxos/config';

import { Config, mapFromKeyValues, mapToKeyValues } from './config.js';
import defaults from './testing/defaults.json' assert { type: 'json' };
import envmap from './testing/envs-map.json' assert { type: 'json' };

it('Empty config', function () {
  const config = new Config({});

  expect(config.values).toBeTruthy();
  expect(config.get('runtime.props.title')).toBeUndefined();
});

it('Basic config', function () {
  const config = new Config({
    runtime: {
      props: {
        title: 'testing'
      }
    }
  }, {
    runtime: {
      app: {
        theme: 'light'
      }
    }
  });

  expect(config.values).toEqual({
    version: 1,
    runtime: {
      app: {
        theme: 'light'
      },
      props: {
        title: 'testing'
      }
    }
  });
});

it('Runtime and module config', function () {
  const config = new Config({
    package: {
      modules: [{
        name: 'example:app/tasks',
        record: {
          web: {
            entryPoint: 'main.js'
          }
        }
      }]
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
    package: {
      modules: [{
        name: 'example:app/tasks',
        record: {
          web: {
            entryPoint: 'main.js'
          }
        }
      }]
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

it.skip('Mapping', function () {
  process.env.TEST_CLIENT_ID = '900';
  process.env.TEST_SERVER_ENDPOINT = 'http://localhost';

  const config = new Config({
    runtime: {
      client: {
        tag: 'testing'
      }
    }
  } as any, mapFromKeyValues(envmap, process.env));

  expect(config.values).toEqual({
    runtime: {
      client: {
        id: 900,
        tag: 'testing'
      },
      server: {
        endpoint: 'http://localhost'
      }
    }
  });

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 900,
    TEST_CLIENT_TAG: 'testing',
    TEST_SERVER_ENDPOINT: 'http://localhost'
  });
});

it.skip('mapToKeyValuesping', function () {
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

it('string values for enums are parsed', function () {
  const config = new Config({
    version: 1,
    runtime: {
      client: {
        mode: 'local'
      }
    }
  } as any);

  expect(config.get('runtime.client.mode')).toEqual(Runtime.Client.Mode.LOCAL);
});

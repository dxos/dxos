//
// Copyright 2021 DXOS.org
//

import { expect, test } from 'vitest';

import { create } from '@dxos/protocols/buf';
import {
  type Config as ConfigProto,
  ConfigSchema,
  ModuleSchema,
  PackageSchema,
  RuntimeSchema,
  Runtime_AppSchema,
  Runtime_PropsSchema,
  Runtime_ServicesSchema,
  Runtime_Services_SignalSchema,
} from '@dxos/protocols/buf/dxos/config_pb';

import { Config, mapFromKeyValues, mapToKeyValues } from './config';
// @ts-ignore
import defaults from './testing/defaults.js';
// @ts-ignore
import envmap from './testing/envs-map.js';

test('Empty config', () => {
  const config = new Config();

  expect(config.values).toBeTruthy();
  expect(config.get('runtime.props.title')).toBeUndefined();
});

test('Basic config', () => {
  const config = new Config(
    create(ConfigSchema, {
      runtime: create(RuntimeSchema, {
        props: create(Runtime_PropsSchema, { title: 'testing' }),
      }),
    }),
    create(ConfigSchema, {
      runtime: create(RuntimeSchema, {
        app: create(Runtime_AppSchema, { theme: 'light' }),
      }),
    }),
  );

  expect(config.values).toMatchObject({
    version: 1,
    runtime: {
      app: {
        theme: 'light',
      },
      props: {
        title: 'testing',
      },
    },
  });
});

test('Runtime and module config', () => {
  const config = new Config(
    create(ConfigSchema, {
      package: create(PackageSchema, {
        modules: [
          create(ModuleSchema, {
            name: 'example:app/tasks',
            record: { web: { entryPoint: 'main.js' } } as any,
          }),
        ],
      }),
    }),
    create(ConfigSchema, {
      runtime: create(RuntimeSchema, {
        services: create(Runtime_ServicesSchema, {
          signaling: [
            create(Runtime_Services_SignalSchema, {
              server: 'ws://localhost:<random-port>',
            }),
          ],
        }),
      }),
    }),
  );

  expect(config.values).toMatchObject({
    version: 1,
    package: {
      modules: [
        {
          name: 'example:app/tasks',
        },
      ],
    },
    runtime: {
      services: {
        signaling: [
          {
            server: 'ws://localhost:<random-port>',
          },
        ],
      },
    },
  });
});

test.skip('Mapping', () => {
  process.env.TEST_CLIENT_ID = '900';
  process.env.TEST_SERVER_ENDPOINT = 'http://localhost';

  const config = new Config(
    create(ConfigSchema, {
      runtime: create(RuntimeSchema, {
        client: { tag: 'testing' } as any,
      }),
    }),
    mapFromKeyValues(envmap, process.env) as ConfigProto,
  );

  expect(config.values).toEqual({
    runtime: {
      client: {
        id: 900,
        tag: 'testing',
      },
      server: {
        endpoint: 'http://localhost',
      },
    },
  });

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 900,
    TEST_CLIENT_TAG: 'testing',
    TEST_SERVER_ENDPOINT: 'http://localhost',
  });
});

test.skip('mapToKeyValuesping', () => {
  const config = new Config(
    create(ConfigSchema, { runtime: create(RuntimeSchema, { client: { tag: 'testing' } as any }) }),
    defaults as any,
  );

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 123,
    TEST_CLIENT_TAG: 'testing',
  });
});

//
// Copyright 2021 DXOS.org
//

import { create, createRegistry, fromBinary, fromJson, toBinary, toJson } from '@bufbuild/protobuf';
import { StructSchema, anyPack } from '@bufbuild/protobuf/wkt';
import { describe, expect, test } from 'vitest';

import { ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';

import { Config, mapFromKeyValues, mapToKeyValues } from './config';
import { EDGE_URLS } from './edge-services';
import { configPreset } from './preset';
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
    {
      runtime: {
        props: {
          title: 'testing',
        },
      },
    },
    {
      runtime: {
        app: {
          theme: 'light',
        },
      },
    },
  );

  expect(toJson(ConfigSchema, config.values)).toEqual({
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
    {
      package: {
        modules: [
          {
            name: 'example:app/tasks',
            record: anyPack(StructSchema, fromJson(StructSchema, { web: { entryPoint: 'main.js' } })),
          },
        ],
      },
    },
    {
      runtime: {
        services: {
          signaling: [
            {
              server: 'ws://localhost:<random-port>',
            },
          ],
        },
      },
    },
  );

  expect(toJson(ConfigSchema, config.values, { registry: createRegistry(StructSchema) })).toEqual({
    version: 1,
    package: {
      modules: [
        {
          name: 'example:app/tasks',
          record: {
            '@type': 'type.googleapis.com/google.protobuf.Struct',
            'value': { web: { entryPoint: 'main.js' } },
          },
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
    {
      runtime: {
        client: {
          tag: 'testing',
        },
      },
    } as any,
    mapFromKeyValues(envmap, process.env),
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
    {
      client: {
        tag: 'testing',
      },
    } as any,
    defaults as any,
  );

  const values = mapToKeyValues(envmap, config.values);

  expect(values).toEqual({
    TEST_CLIENT_ID: 123,
    TEST_CLIENT_TAG: 'testing',
  });
});

describe('Config sources', () => {
  test('message source produces an encodable config', () => {
    const config = new Config(
      {
        runtime: {
          client: {
            storage: { persistent: true },
          },
        },
      },
      configPreset({ edge: 'preview' }).values,
    );

    expect(() => toBinary(ConfigSchema, config.values)).not.toThrow();
    expect(config.get('runtime.client.storage.persistent')).to.eq(true);
    expect(config.get('runtime.services.edge.url')).to.eq(EDGE_URLS.preview);
  });

  test('reversed source order produces an encodable config', () => {
    const config = new Config(configPreset({ edge: 'preview' }).values, {
      runtime: {
        client: {
          storage: { persistent: true },
        },
      },
    });

    expect(() => toBinary(ConfigSchema, config.values)).not.toThrow();
    expect(config.get('runtime.client.storage.persistent')).to.eq(true);
  });

  test('unknown wire fields survive a source round-trip', () => {
    // A varint field this build's schema does not know, as `fromBinary` would leave it on the message.
    const unknown = { no: 9999, wireType: 0, data: new Uint8Array([42]) };
    const source = create(ConfigSchema, { version: 1 });
    source.$unknown = [unknown];

    const config = new Config(source, {
      runtime: {
        client: {
          storage: { persistent: true },
        },
      },
    });

    expect(config.values.$unknown).to.deep.eq([unknown]);
    expect(config.get('runtime.client.storage.persistent')).to.eq(true);

    const decoded = fromBinary(ConfigSchema, toBinary(ConfigSchema, config.values));
    expect(decoded.$unknown).to.deep.eq([unknown]);
  });
});

//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'vitest';

import { type Config as ConfigProto, Runtime } from '@dxos/protocols/proto/dxos/config';

import { parseProto } from './proto-to-effect';

const require = createRequire(import.meta.url);
const CONFIG_PROTO_PATH = require.resolve('@dxos/protocols/proto/dxos/config.proto');
const CONFIG_PROTO_SOURCE = readFileSync(CONFIG_PROTO_PATH, 'utf8');

describe('parseProto / config.proto', () => {
  test('registers every nested message under dxos.config', ({ expect }) => {
    const registry = parseProto(CONFIG_PROTO_SOURCE);
    const types = registry.list();
    expect(types).toContain('dxos.config.Config');
    expect(types).toContain('dxos.config.Package');
    expect(types).toContain('dxos.config.Plugin');
    expect(types).toContain('dxos.config.Plugin.Build');
    expect(types).toContain('dxos.config.Runtime');
    expect(types).toContain('dxos.config.Runtime.Client');
    expect(types).toContain('dxos.config.Runtime.Client.Storage');
    expect(types).toContain('dxos.config.Runtime.Services');
  });

  test('decodes a realistic Config value', ({ expect }) => {
    const registry = parseProto(CONFIG_PROTO_SOURCE);
    const Config = registry.get('dxos.config.Config');

    const value: ConfigProto = {
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: true,
            sqliteMode: Runtime.Client.Storage.SqliteMode.OPFS,
            dataRoot: '/var/lib/dxos',
          },
          log: { filter: 'info' },
          edgeFeatures: { subductionReplicator: true, signaling: true },
          servicesMode: Runtime.Client.ServicesMode.SHARED_WORKER,
        },
        services: {
          edge: { url: 'wss://edge.dxos.org' },
          signaling: [{ server: 'wss://signal.dxos.org', api: 'v1' }],
        },
        keys: [
          { name: 'OPENAI_API_KEY', value: 'sk-...' },
          { name: 'ANTHROPIC_API_KEY', value: 'ant-...' },
        ],
      },
    };

    expect(Schema.decodeUnknownSync(Config)(value)).toEqual(value);
  });

  test('accepts numeric enum values and rejects unknown values', ({ expect }) => {
    const registry = parseProto(CONFIG_PROTO_SOURCE);
    const Storage = registry.get('dxos.config.Runtime.Client.Storage');
    const { OPFS, MEMORY } = Runtime.Client.Storage.SqliteMode;

    expect(Schema.decodeUnknownSync(Storage)({ sqliteMode: OPFS })).toEqual({ sqliteMode: OPFS });
    expect(Schema.decodeUnknownSync(Storage)({ sqliteMode: MEMORY })).toEqual({ sqliteMode: MEMORY });
    // String enum names no longer round-trip -- enums are numeric on the wire.
    expect(() => Schema.decodeUnknownSync(Storage)({ sqliteMode: 'OPFS' })).toThrow();
    // 99 is not a defined member of SqliteMode.
    expect(() => Schema.decodeUnknownSync(Storage)({ sqliteMode: 99 })).toThrow();
  });

  test('exposes proto enum name<->value maps via getEnum', ({ expect }) => {
    const registry = parseProto(CONFIG_PROTO_SOURCE);

    expect(registry.listEnums()).toContain('dxos.config.Runtime.Client.Storage.SqliteMode');
    expect(registry.listEnums()).toContain('dxos.config.Runtime.Client.ServicesMode');

    expect(registry.getEnum('dxos.config.Runtime.Client.Storage.SqliteMode')).toEqual({
      UNSPECIFIED_SQLITE_MODE: 0,
      MEMORY: 1,
      OPFS: 2,
      FILE: 3,
    });
    expect(registry.getEnum('dxos.does.not.exist')).toBeUndefined();
  });

  test('handles repeated fields', ({ expect }) => {
    const registry = parseProto(CONFIG_PROTO_SOURCE);
    const Package = registry.get('dxos.config.Package');

    const value = {
      license: 'MIT',
      repos: [{ name: 'core', url: 'git@github.com:dxos/dxos.git', version: '1.0.0' }],
      plugins: [{ id: 'a' }, { id: 'b' }],
    };
    expect(Schema.decodeUnknownSync(Package)(value)).toEqual(value);
  });

  test('handles recursive types via lazy refs', ({ expect }) => {
    const registry = parseProto(CONFIG_PROTO_SOURCE);
    const Module = registry.get('dxos.config.Plugin');

    const value = {
      id: 'root',
      deps: [{ id: 'child-a', deps: [{ id: 'grandchild' }] }, { id: 'child-b' }],
    };
    expect(Schema.decodeUnknownSync(Module)(value)).toEqual(value);
  });

  test('accepts an arbitrary object for google.protobuf.Any', ({ expect }) => {
    const registry = parseProto(CONFIG_PROTO_SOURCE);
    const Module = registry.get('dxos.config.Plugin');

    const value = {
      id: 'mod',
      record: { '@type': 'dxos.example.Frame', payload: { x: 1, y: 'two' } },
    };
    expect(Schema.decodeUnknownSync(Module)(value)).toEqual(value);
  });

  test('camelCases snake_case proto field names', ({ expect }) => {
    const registry = parseProto(CONFIG_PROTO_SOURCE);
    const Storage = registry.get('dxos.config.Runtime.Client.Storage');

    // proto: `data_root` -> JS: `dataRoot`. Passing `data_root` should fail
    // strict decode (it's not a known field) - actually Effect Struct allows
    // unknown keys by default. Instead assert the camelCase form decodes.
    expect(Schema.decodeUnknownSync(Storage)({ dataRoot: '/tmp' })).toEqual({ dataRoot: '/tmp' });
  });
});

describe('parseProto / unsupported features', () => {
  test('rejects map<K, V> fields with a clear error', ({ expect }) => {
    const source = `
      syntax = "proto3";
      package dxos.test;
      message WithMap {
        map<string, int32> counts = 1;
      }
    `;
    expect(() => parseProto(source)).toThrow(/map fields are not supported/);
  });
});

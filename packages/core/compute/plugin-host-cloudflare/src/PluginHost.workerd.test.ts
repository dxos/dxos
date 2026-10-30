//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Fibonacci, Reply } from '@dxos/compute/testing';
import { Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import * as PluginHost from './PluginHost.ts';
import { TEST_BASE_PLUGIN_KEY, TEST_PLUGIN_KEY, TestBasePlugin, TestPlugin, TestSkill } from './testing/index.ts';

const SPACE_ID = 'B2N35FBQKXIOTC5XEOCRVORIYQZHM2IBM';

const makeHost = () => PluginHost.make(() => ({ primary: TestPlugin(), dependencies: [TestBasePlugin()] }));

describe('PluginHost', () => {
  test('describes what the primary plugin contributes, not its dependencies', async ({ expect }) => {
    const catalog = await makeHost().describe();

    expect(catalog.failures).toEqual([]);
    expect(catalog.plugin).toEqual({ key: TEST_PLUGIN_KEY, name: 'Host test' });
    expect(catalog.dependencies).toEqual([{ key: TEST_BASE_PLUGIN_KEY, name: 'Host test base' }]);
    expect(catalog.types.map(({ typename }) => typename)).toEqual([Type.getTypename(TestSchema.Person)]);
    expect(catalog.types[0].jsonSchema).toMatchObject({ type: 'object' });
    expect(catalog.skills).toMatchObject([{ key: TestSkill.key, name: 'Host test', mcpPrompt: true }]);
    expect(catalog.skills[0].tools.length).toBe(1);
    const operations = JSON.stringify(catalog.operations);
    expect(operations).toContain(String(Reply.meta.key));
    expect(operations).not.toContain(String(Fibonacci.meta.key));
  });

  test('reports a dependency the release does not bundle', async ({ expect }) => {
    const catalog = await PluginHost.make(() => ({ primary: TestPlugin() })).describe();
    expect(catalog.failures).toMatchObject([{ id: TEST_PLUGIN_KEY, message: expect.stringContaining('missing') }]);
    expect(catalog.operations).toEqual([]);
  });

  test('invokes an operation of the primary plugin by key', async ({ expect }) => {
    const host = makeHost();
    expect(await host.invoke({ operationKey: String(Reply.meta.key), input: { hello: 'world' } }, {})).toEqual({
      ok: true,
      output: { hello: 'world' },
    });
    // EDGE names an operation by its bare key.
    expect(await host.invoke({ operationKey: 'com.example.operation.reply', input: 'bare' }, {})).toEqual({
      ok: true,
      output: 'bare',
    });
    // A dependency's operation is not the release's own.
    expect(await host.invoke({ operationKey: String(Fibonacci.meta.key), input: {} }, {})).toMatchObject({
      ok: false,
      error: { code: 'operation-not-found' },
    });
  });

  test('activates once per host and reuses it across calls', async ({ expect }) => {
    let made = 0;
    const host = PluginHost.make(() => {
      made++;
      return { primary: TestPlugin(), dependencies: [TestBasePlugin()] };
    });
    await Promise.all([
      host.invoke({ operationKey: String(Reply.meta.key), input: 1 }, {}),
      host.invoke({ operationKey: String(Reply.meta.key), input: 2 }, {}),
    ]);
    await host.describe();
    expect(made).toBe(1);
  });

  test('returns failures as data: an unknown operation and an invalid or unserved space', async ({ expect }) => {
    const host = makeHost();
    expect(await host.invoke({ operationKey: 'com.example.operation.missing' }, {})).toMatchObject({
      ok: false,
      error: { code: 'operation-not-found', name: 'OperationNotFoundError' },
    });
    expect(await host.invoke({ operationKey: String(Reply.meta.key), spaceId: 'nope' }, {})).toMatchObject({
      ok: false,
      error: { code: 'invalid-request', message: expect.stringContaining('nope') },
    });
    // A space needs the data bindings, which this host was not given.
    expect(await host.invoke({ operationKey: String(Reply.meta.key), spaceId: SPACE_ID }, {})).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' },
    });
  });
});

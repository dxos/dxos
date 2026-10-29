//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Fibonacci, Reply } from '@dxos/compute/testing';
import { Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { FUNCTION_ROUTE_HEADER, FunctionRouteValue } from '@dxos/functions-runtime-cloudflare';

import type * as PluginCatalog from './PluginCatalog.ts';
import * as PluginHost from './PluginHost.ts';
import { TEST_BASE_PLUGIN_KEY, TEST_PLUGIN_KEY, TestBasePlugin, TestPlugin, TestSkill } from './testing/index.ts';

const URL = 'https://plugin.test/';
const SPACE_ID = 'B2N35FBQKXIOTC5XEOCRVORIYQZHM2IBM';

const makeHost = () => PluginHost.make(() => ({ primary: TestPlugin(), dependencies: [TestBasePlugin()] }));

const fetchInvoke = (host: PluginHost.Host, key: string, data: unknown, search = '') =>
  host.fetch(
    new Request(`${URL}${search}`, {
      method: 'POST',
      headers: { [PluginHost.OPERATION_KEY_HEADER]: key },
      body: JSON.stringify({ data }),
    }),
    {},
  );

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
      hello: 'world',
    });
    // EDGE names an operation by its bare key.
    expect(await host.invoke({ operationKey: 'com.example.operation.reply', input: 'bare' }, {})).toEqual('bare');
    await expect(host.invoke({ operationKey: String(Fibonacci.meta.key), input: {} }, {})).rejects.toBeInstanceOf(
      PluginHost.OperationNotFoundError,
    );
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

  test('rejects an unknown operation and an invalid or unserved space', async ({ expect }) => {
    const host = makeHost();
    await expect(host.invoke({ operationKey: 'com.example.operation.missing' }, {})).rejects.toBeInstanceOf(
      PluginHost.OperationNotFoundError,
    );
    await expect(host.invoke({ operationKey: String(Reply.meta.key), spaceId: 'nope' }, {})).rejects.toBeInstanceOf(
      PluginHost.InvalidRequestError,
    );
    // A space needs the data bindings, which this host was not given.
    await expect(host.invoke({ operationKey: String(Reply.meta.key), spaceId: SPACE_ID }, {})).rejects.toBeInstanceOf(
      PluginHost.InvalidRequestError,
    );
  });

  describe('functions protocol', () => {
    test('meta route returns the catalog', async ({ expect }) => {
      const response = await makeHost().fetch(
        new Request(URL, { headers: { [FUNCTION_ROUTE_HEADER]: FunctionRouteValue.Meta } }),
        {},
      );
      expect(response.status).toBe(200);
      const catalog: PluginCatalog.Catalog = await response.json();
      expect(catalog.plugin.key).toBe(TEST_PLUGIN_KEY);
    });

    test('answers with EdgeResponse envelopes', async ({ expect }) => {
      const host = makeHost();
      const ok = await fetchInvoke(host, String(Reply.meta.key), { hello: 'world' });
      expect(await ok.json()).toEqual({ success: true, data: { hello: 'world' } });

      const unknown = await fetchInvoke(host, 'com.example.operation.missing', {});
      expect(unknown.status).toBe(404);
      expect(await unknown.json()).toMatchObject({ success: false });

      const invalidSpace = await fetchInvoke(host, String(Reply.meta.key), {}, '?spaceId=nope');
      expect(invalidSpace.status).toBe(400);

      const missingKey = await host.fetch(new Request(URL, { method: 'POST', body: JSON.stringify({ data: {} }) }), {});
      expect(missingKey.status).toBe(400);
    });
  });
});

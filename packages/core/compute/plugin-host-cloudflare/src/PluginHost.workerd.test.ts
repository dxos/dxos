//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Fibonacci, Reply } from '@dxos/compute/testing';
import { Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import * as PluginHost from './PluginHost.ts';
import { Inspect, InspectEvent, TEST_PLUGIN_KEY, TestPlugin, TestSkill } from './testing/index.ts';

const SPACE_ID = 'B2N35FBQKXIOTC5XEOCRVORIYQZHM2IBM';

/** The part of a `Trace.Message` JSON the tests read. */
const SinkMessage = Schema.Struct({
  meta: Schema.Struct({ pid: Schema.String, parentPid: Schema.optional(Schema.String) }),
  events: Schema.Array(Schema.Struct({ type: Schema.String })),
});

/** A trace sink that keeps what it is sent. */
const collectingSink = () => {
  const messages: Schema.Schema.Type<typeof SinkMessage>[] = [];
  return {
    messages,
    sink: { write: (message: object) => void messages.push(Schema.decodeUnknownSync(SinkMessage)(message)) },
  };
};

const makeHost = () => PluginHost.make(() => ({ primary: TestPlugin() }));

describe('PluginHost', () => {
  test('describes what the plugin contributes', async ({ expect }) => {
    const catalog = await makeHost().describe();

    expect(catalog.failures).toEqual([]);
    expect(catalog.plugin).toEqual({ key: TEST_PLUGIN_KEY, name: 'Host test' });
    expect(catalog.types.map(({ typename }) => typename)).toEqual([Type.getTypename(TestSchema.Person)]);
    expect(catalog.types[0].jsonSchema).toMatchObject({ type: 'object' });
    expect(catalog.skills).toMatchObject([{ key: TestSkill.key, name: 'Host test', mcpPrompt: true }]);
    expect(catalog.skills[0].tools.length).toBe(1);
    const operations = JSON.stringify(catalog.operations);
    expect(operations).toContain(String(Reply.meta.key));
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
    // An operation the plugin does not contribute is not found.
    expect(await host.invoke({ operationKey: String(Fibonacci.meta.key), input: {} }, {})).toMatchObject({
      ok: false,
      error: { code: 'operation-not-found' },
    });
  });

  test('activates once per host and reuses it across calls', async ({ expect }) => {
    let made = 0;
    const host = PluginHost.make(() => {
      made++;
      return { primary: TestPlugin() };
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

  // The request context operation-service gives a handler (EDGE-PLUGINS F-5.6).
  describe('request context', () => {
    test("forwards the handler's trace events to the sink, between start and end envelopes", async ({ expect }) => {
      const { messages, sink } = collectingSink();
      const result = await makeHost().invoke(
        { operationKey: String(Inspect.meta.key), input: {} },
        {},
        {
          traceSink: sink,
          parentPid: 'parent',
        },
      );
      expect(result).toMatchObject({ ok: true });
      const types = messages.flatMap((message) => message.events.map((event) => event.type));
      expect(types).toEqual(['operation.start', InspectEvent.key, 'operation.end']);
      expect(messages[0].meta).toMatchObject({ parentPid: 'parent' });
    });

    test('a caller-minted pid owns the envelopes', async ({ expect }) => {
      const { messages, sink } = collectingSink();
      await makeHost().invoke(
        { operationKey: String(Inspect.meta.key), input: {} },
        {},
        { traceSink: sink, pid: 'minted' },
      );
      expect(messages).toHaveLength(1);
      expect(messages[0].meta).toMatchObject({ pid: 'minted' });
    });

    test("aborts the handler's cancellation signal when the caller cancels", async ({ expect }) => {
      const result = await makeHost().invoke(
        { operationKey: String(Inspect.meta.key), input: { waitForCancel: true } },
        {},
        { cancellation: { waitForCancel: () => new Promise((resolve) => setTimeout(resolve, 10)) } },
      );
      expect(result).toMatchObject({ ok: true, output: { cancelled: true } });
    });

    test('pins the ids the handler mints to the seed', async ({ expect }) => {
      const host = makeHost();
      const invoke = () =>
        host.invoke(
          { operationKey: String(Inspect.meta.key), input: {} },
          {},
          { idSeed: { time: 1_700_000_000_000, seed: 7 } },
        );
      const [first, second] = [await invoke(), await invoke()];
      expect(first).toMatchObject({ ok: true });
      expect(first).toEqual(second);
    });

    test('a conversation needs a space, whose database holds it', async ({ expect }) => {
      expect(
        await makeHost().invoke(
          { operationKey: String(Inspect.meta.key), input: {} },
          {},
          {
            conversation: 'echo://B2N35FBQKXIOTC5XEOCRVORIYQZHM2IBM/01KABCDEFGHJKMNPQRSTVWXYZ0',
          },
        ),
      ).toMatchObject({
        ok: false,
        error: { code: 'invalid-request', message: expect.stringContaining('conversation') },
      });
    });
  });
});

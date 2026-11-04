//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Fibonacci, Reply } from '@dxos/compute/testing';
import { Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EntityId } from '@dxos/keys';
import { ErrorCodec, PluginProtocol } from '@dxos/protocols';

import * as PluginHost from './PluginHost.ts';
import {
  Adopt,
  Delegate,
  Fails,
  Followup,
  Greet,
  Greeter,
  Inspect,
  InspectEvent,
  Nest,
  TEST_PLUGIN_KEY,
  TestFailure,
  TestPlugin,
  TestSkill,
} from './testing/index.ts';

const SPACE_ID = 'B2N35FBQKXIOTC5XEOCRVORIYQZHM2IBM';

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

  // EDGE speaks to a bundle at the version of the host it was published with (EDGE-PLUGINS F-6.9).
  test('reports the protocol version it speaks', async ({ expect }) => {
    expect((await makeHost().describe()).protocolVersion).toBe(PluginProtocol.PROTOCOL_VERSION);
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

  // A tool error reads the same whichever routing ran the operation (operation-service rethrows `ErrorCodec`'s form).
  test("returns the handler's error encoded as operation-service sends it", async ({ expect }) => {
    const result = await makeHost().invoke({ operationKey: String(Fails.meta.key), input: {} }, {});
    expect(result.ok).toBe(false);
    const expected = ErrorCodec.encode(new TestFailure({ context: { uri: 'echo:///missing' } }));
    const encoded = result.ok ? undefined : result.error.encoded;
    expect(encoded && ErrorCodec.decode(encoded).message).toBe(ErrorCodec.decode(expected).message);
    expect(encoded?.name).toBe('TestFailure');
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

    // operation-service derives a nested invocation's seed from the parent's stream, and the parent continues on it.
    test('an in-process nested operation draws its ids as operation-service does', async ({ expect }) => {
      const host = makeHost();
      const idSeed = { time: 1_700_000_000_000, seed: 7 };
      const nested = await host.invoke({ operationKey: String(Nest.meta.key), input: {} }, {}, { idSeed });

      // The parent mints its pid, then draws the child's seed; the child mints its pid, then the id it returns.
      EntityId.dangerouslySetSeed(idSeed.time, idSeed.seed);
      EntityId.random();
      const childSeed = { time: idSeed.time, seed: fnv1a(EntityId.random()) };
      EntityId.dangerouslySetSeed(childSeed.time, childSeed.seed);
      const [, inner, after] = [EntityId.random(), EntityId.random(), EntityId.random()];
      expect(nested).toEqual({ ok: true, output: { inner, after } });
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

  // Services only EDGE holds, and other plugins' operations (EDGE-PLUGINS F-5.7).
  describe('host services', () => {
    test('a handler reaches a service EDGE serves, its methods and streams', async ({ expect }) => {
      const calls: unknown[] = [];
      const services: PluginProtocol.HostServices = {
        descriptors: [{ key: Greeter.key, streams: ['names'] }],
        host: {
          call: async (service, method, args) => {
            calls.push([service, method, ...args]);
            return method === 'names'
              ? { ok: true, value: ['Ada', 'Grace'] }
              : { ok: true, value: `Hello, ${String(args[0])}` };
          },
        },
      };
      const result = await makeHost().invoke({ operationKey: String(Greet.meta.key), input: {} }, {}, { services });
      expect(result).toEqual({ ok: true, output: ['Hello, Ada', 'Hello, Grace'] });
      expect(calls).toEqual([
        [Greeter.key, 'names'],
        [Greeter.key, 'greet', 'Ada'],
        [Greeter.key, 'greet', 'Grace'],
      ]);
    });

    test('a service failure fails the handler with its message', async ({ expect }) => {
      const services: PluginProtocol.HostServices = {
        descriptors: [{ key: Greeter.key, streams: ['names'] }],
        host: { call: async () => ({ ok: false, error: { code: 'failed', message: 'The bot is offline.' } }) },
      };
      expect(
        await makeHost().invoke({ operationKey: String(Greet.meta.key), input: {} }, {}, { services }),
      ).toMatchObject({ ok: false, error: { message: expect.stringContaining('The bot is offline.') } });
    });

    test('a service EDGE does not serve is not found', async ({ expect }) => {
      expect(await makeHost().invoke({ operationKey: String(Greet.meta.key), input: {} }, {})).toMatchObject({
        ok: false,
        error: { message: expect.stringContaining('Service not found') },
      });
    });

    test("a scheduled followup's failure does not fail its caller", async ({ expect }) => {
      const operations: PluginProtocol.OperationHost = {
        invoke: async () => ({ ok: false, error: { code: 'failed', message: 'The followup failed.' } }),
      };
      const host = makeHost();
      expect(await host.invoke({ operationKey: String(Followup.meta.key), input: {} }, {}, { operations })).toEqual({
        ok: true,
        output: { done: true },
      });
      expect(await host.invoke({ operationKey: String(Followup.meta.key), input: {} }, {})).toEqual({
        ok: true,
        output: { done: true },
      });
    });

    // In process the callee's output is the caller's own object, as operation-service returns it.
    test.fails('an in-process call returns a live object', async ({ expect }) => {
      expect(await makeHost().invoke({ operationKey: String(Adopt.meta.key), input: {} }, {})).toEqual({
        ok: true,
        output: { live: true },
      });
    });

    test("runs its own operations in process and other plugins' through EDGE", async ({ expect }) => {
      const invoked: unknown[] = [];
      const operations: PluginProtocol.OperationHost = {
        invoke: async (operationKey, input, options) => {
          invoked.push({ operationKey, input, options });
          return { ok: true, output: { result: '55' } };
        },
      };
      const result = await makeHost().invoke(
        { operationKey: String(Delegate.meta.key), input: { n: 10 } },
        {},
        { operations, pid: 'outer' },
      );
      expect(result).toEqual({ ok: true, output: { reply: { n: 10 }, fibonacci: { result: '55' } } });
      expect(invoked).toEqual([
        { operationKey: 'com.example.operation.fib', input: { iterations: 10 }, options: { parentPid: 'outer' } },
      ]);
    });
  });
});

/** FNV-1a of an id, as operation-service derives a nested invocation's seed. */
const fnv1a = (id: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

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

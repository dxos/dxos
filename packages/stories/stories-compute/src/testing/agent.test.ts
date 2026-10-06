//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Stream from 'effect/Stream';

import { ProcessManager } from '@dxos/compute-runtime';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';

import { AGENT_DEMO_PROCESS_KEY, AgentDemoProcess, makeScript } from './agent.ts';

const TestLayer = ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator }).pipe(
  Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, ServiceResolver.empty)),
  Layer.provide(KeyValueStore.layerMemory),
  Layer.provide(OperationHandlerSet.provide(OperationHandlerSet.empty)),
  Layer.provide(Trace.layerNoop),
  Layer.provideMerge(Registry.layer),
);

const PROMPT = 'Fix the flaky timeout in the sync engine tests';

describe('AgentDemoProcess', () => {
  it('picks tools from the prompt and is deterministic in its seed', ({ expect }) => {
    const script = makeScript(PROMPT, 42);
    expect(script).toEqual(makeScript(PROMPT, 42));
    expect(script[0]).toMatchObject({ kind: 'prompt', text: PROMPT });
    expect(script.at(-1)?.kind).toEqual('answer');
    expect(script.filter(({ kind }) => kind === 'tool-call').map(({ tool }) => tool)).toContain('run_tests');
    expect(makeScript('Research the Lisbon tram network', 1).some(({ tool }) => tool === 'search_web')).toBe(true);
  });

  // Live clock: alarms scheduled from inside an alarm need real time to elapse.
  it.live(
    'pushes the whole transcript, then succeeds',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(AgentDemoProcess);
      const expected = makeScript(PROMPT, 0).length;
      const outputs = yield* handle.subscribeOutputs().pipe(Stream.take(expected), Stream.runCollect, Effect.forkChild);
      yield* handle.submitInput({ prompt: PROMPT, pace: 0.01 });
      const entries = yield* Fiber.join(outputs);
      expect(entries.map(({ seq }) => seq)).toEqual([...Array(expected).keys()]);
      expect(entries[0]).toMatchObject({ kind: 'prompt', text: PROMPT });
      yield* handle.runToCompletion();
      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(TestLayer)),
    10_000,
  );

  it.live(
    'a revived process continues the transcript where it stopped',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(AgentDemoProcess);
      const before = yield* handle.subscribeOutputs().pipe(Stream.take(3), Stream.runCollect, Effect.forkChild);
      yield* handle.submitInput({ prompt: PROMPT, pace: 0.05 });
      const first = yield* Fiber.join(before);
      expect(first.map(({ seq }) => seq)).toEqual([0, 1, 2]);

      yield* manager.shutdown();
      yield* manager.startup();
      const [dormant] = yield* manager.list({ key: AGENT_DEMO_PROCESS_KEY });
      const revived = yield* dormant.hydrate(AgentDemoProcess);
      const after = yield* revived.subscribeOutputs().pipe(Stream.take(1), Stream.runCollect, Effect.forkChild);
      const [next] = yield* Fiber.join(after);
      expect(next.seq).toBeGreaterThanOrEqual(3);
      expect(first[2].text).not.toEqual(next.text);
      yield* revived.terminate();
    }, Effect.provide(TestLayer)),
    10_000,
  );
});

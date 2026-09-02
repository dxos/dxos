//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Tracer from 'effect/Tracer';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { OpaqueToolkit, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { operationServiceLayerNoop } from '@dxos/compute/testing';
import * as Trace from '@dxos/compute/Trace';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { makeTracer } from '@dxos/effect';
import { ContentBlock, type Message } from '@dxos/types';

import * as AiRequest from './AiRequest';

const { text, toolCall, scriptedLanguageModelLayer } = ScriptedLanguageModel;

// Real handler, so a scripted tool call drives a genuine tool-call → result → continue cycle.
const TestToolkit = Toolkit.make(
  Tool.make('Echo', {
    description: 'Returns its input value verbatim.',
    parameters: Schema.Struct({
      value: Schema.String.annotate({ description: 'The value to echo.' }),
    }),
    success: Schema.Struct({ value: Schema.String }),
    failure: Schema.Never,
  }),
);

const toolkit = OpaqueToolkit.make(
  TestToolkit,
  TestToolkit.toLayer({
    Echo: ({ value }) => Effect.succeed({ value }),
  }),
);

// `RunRequirements` types several services `run()` never yields on this path, hence the noops below.
const testLayer = (turns: readonly ScriptedLanguageModel.ScriptedTurn[]) =>
  Layer.mergeAll(
    scriptedLanguageModelLayer(turns),
    ToolExecutionService.layerEmpty,
    ToolResolverService.layerEmpty,
    TestDatabaseLayer(),
    registryLayerNoop,
    operationServiceLayerNoop,
    Trace.testTraceService().pipe(Layer.provide(Trace.layerNoop)),
  );

// Lower-level counterpart to `scripted-loop.test.ts` (`@dxos/agent-runtime`): same loop shapes, no `AssistantTestLayer`.
describe('AiRequest.Request.run (scripted model)', () => {
  it.effect('completes in one turn when the model emits no tool calls', () =>
    Effect.gen(function* () {
      const request = new AiRequest.Request();
      const messages = yield* request.run({ prompt: 'Say hi.', history: [] });

      expect(textOf(messages)).toContain('Hi there.');
      expect(request.toolCalls).toEqual(0);
    }).pipe(Effect.provide(testLayer([{ parts: [text('Hi there.')] }]))),
  );

  it.effect('executes a tool call, feeds the result back, then stops', () =>
    Effect.gen(function* () {
      const request = new AiRequest.Request();
      const messages = yield* request.run({ toolkit, prompt: 'Echo hello.', history: [] });

      expect(toolResultsOf(messages)).toHaveLength(1);
      expect(textOf(messages)).toContain('Echoed the value.');
      expect(request.toolCalls).toEqual(1);
    }).pipe(
      Effect.provide(
        testLayer([{ parts: [toolCall('Echo', { value: 'hello' })] }, { parts: [text('Echoed the value.')] }]),
      ),
    ),
  );

  it.effect('iterates until the model stops, feeding each tool result back', () =>
    Effect.gen(function* () {
      const request = new AiRequest.Request();
      const messages = yield* request.run({ toolkit, prompt: 'Echo twice.', history: [] });

      expect(toolResultsOf(messages)).toHaveLength(2);
      expect(textOf(messages)).toContain('All done.');
      expect(request.toolCalls).toEqual(2);
    }).pipe(
      Effect.provide(
        testLayer([
          { parts: [toolCall('Echo', { value: 'first' })] },
          { parts: [toolCall('Echo', { value: 'second' })] },
          { parts: [text('All done.')] },
        ]),
      ),
    ),
  );
});

const textOf = (messages: readonly Message.Message[]): string =>
  messages
    .flatMap((message) => message.blocks)
    .filter(ContentBlock.is('text'))
    .map((block) => block.text)
    .join('');

const toolResultsOf = (messages: readonly Message.Message[]) =>
  messages.flatMap((message) => message.blocks).filter(ContentBlock.is('toolResult'));

// Capture is only ever asserted against a stubbed `LanguageModel`; the app's path is this one —
// `streamText`, an agent loop, a toolkit — and a model call that is never reported is invisible.
describe('AiRequest.Request.run (telemetry)', () => {
  it.effect('reports the tool call as a tool span, named after the tool', () =>
    Effect.gen(function* () {
      const exporter = new InMemorySpanExporter();
      const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

      const request = new AiRequest.Request();
      yield* request
        .run({ toolkit, prompt: 'Echo hello.', history: [] })
        .pipe(Effect.provideService(Tracer.Tracer, makeTracer(provider, 'test')));
      yield* Effect.promise(() => provider.forceFlush());

      // The span is named for the function that ran the tool, so the tool's own name and its
      // arguments and result ride as attributes for the analytics sink.
      const toolSpan = exporter.getFinishedSpans().find(({ name }) => name === 'callTool');
      expect(toolSpan?.attributes['dxos.ai.kind']).toEqual('tool');
      expect(toolSpan?.attributes['dxos.ai.name']).toEqual('Echo');
      expect(JSON.parse(String(toolSpan?.attributes['dxos.ai.input']))).toEqual({ value: 'hello' });
      expect(JSON.parse(String(toolSpan?.attributes['dxos.ai.output']))).toEqual({ value: 'hello' });
    }).pipe(
      Effect.provide(
        testLayer([{ parts: [toolCall('Echo', { value: 'hello' })] }, { parts: [text('Echoed the value.')] }]),
      ),
    ),
  );

  it.effect('reports every model call of a turn', () =>
    Effect.gen(function* () {
      const exporter = new InMemorySpanExporter();
      const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

      const request = new AiRequest.Request();
      yield* request
        .run({ toolkit, prompt: 'Echo hello.', history: [] })
        .pipe(Effect.provideService(Tracer.Tracer, makeTracer(provider, 'test')));
      yield* Effect.promise(() => provider.forceFlush());

      // Two model calls: the one that asks for the tool, and the one that answers after it ran.
      const modelSpans = exporter.getFinishedSpans().filter(({ name }) => name.startsWith('LanguageModel.'));
      expect(modelSpans).toHaveLength(2);
      expect(modelSpans.every((span) => span.attributes['gen_ai.system'] !== undefined)).toEqual(true);
    }).pipe(
      Effect.provide(
        testLayer([{ parts: [toolCall('Echo', { value: 'hello' })] }, { parts: [text('Echoed the value.')] }]),
      ),
    ),
  );
});

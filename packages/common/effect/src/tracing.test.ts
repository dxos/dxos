import { describe, test } from 'vitest';
import { Effect, Layer, Tracer } from 'effect';
import type { Context } from 'effect/Context';
import type { Exit } from 'effect/Exit';
import type { Option } from 'effect/Option';
import { NodeSdk } from '@effect/opentelemetry';
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
  SimpleSpanProcessor,
  SpanExporter,
  type Span,
  type ReadableSpan,
} from '@opentelemetry/sdk-trace-base';
import { type ExportResult, ExportResultCode } from '@opentelemetry/core';

const apples = Effect.fn('apples')(function* (count: number) {
  const appleCount = Math.floor(count / 2);
  yield* Effect.log(`apples: ${appleCount}`);
  yield* oranges(count - appleCount);
});

const oranges = Effect.fn('oranges')(function* (orangeCount: number) {
  yield* Effect.log(`oranges: ${orangeCount}`);
});

const fruits = Effect.gen(function* () {
  yield* apples(20);
});

describe('tracing', () => {
  test.only('otel tracer', async () => {
    class MySpanExporter implements SpanExporter {
      export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
        console.log('export', { spans });
        resultCallback({ code: ExportResultCode.SUCCESS });
      }
      async shutdown(): Promise<void> {}
      async forceFlush?(): Promise<void> {}
    }
    const spanProcessor = new BatchSpanProcessor(new MySpanExporter());
    const NodeSdkLive = NodeSdk.layer(() => ({
      resource: { serviceName: 'example' },
      // Export span data to the console
      spanProcessor,
    }));
    await Effect.runPromise(fruits.pipe(Effect.provide(NodeSdkLive)));
    await spanProcessor.shutdown();
  });

  test('custom tracer', async () => {
    class MySpan implements Tracer.Span {
      _tag: 'Span' = 'Span';
      constructor(
        public readonly name: string,
        public readonly parent: Option<Tracer.AnySpan>,
        public readonly context: Context<never>,
        public readonly links: readonly Tracer.SpanLink[],
        public readonly startTime: bigint,
        public readonly kind: Tracer.SpanKind,
      ) {
        this.spanId = Math.random().toString(36).substring(2, 15);
        this.traceId = Math.random().toString(36).substring(2, 15);
      }

      spanId: string;
      traceId: string;

      status: Tracer.SpanStatus = { _tag: 'Started', startTime: BigInt(0) };
      attributes: ReadonlyMap<string, unknown> = new Map();
      sampled: boolean = false;
      end(endTime: bigint, exit: Exit<unknown, unknown>): void {
        console.log('end', { endTime, exit });
      }
      attribute(key: string, value: unknown): void {
        console.log('attribute', { key, value });
      }
      event(name: string, startTime: bigint, attributes?: Record<string, unknown>): void {
        console.log('event', { name, startTime, attributes });
      }
      addLinks(links: ReadonlyArray<Tracer.SpanLink>): void {
        console.log('addLinks', { links });
      }
    }

    const tracer = Tracer.make({
      context(f, fiber) {
        return f();
      },
      span(name, parent, context, links, startTime, kind) {
        console.log('span', { name, parent, context, links, startTime, kind });
        return new MySpan(name, parent, context, links, startTime, kind);
      },
    });
    const layer = Layer.setTracer(tracer);
    await Effect.runPromise(fruits.pipe(Effect.provide(layer)));
  });
});

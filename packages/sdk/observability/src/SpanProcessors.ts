//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, reached at `@dxos/observability/SpanProcessors`: the processors a host
// attaches to a tracer provider it owns elsewhere (EDGE puts them in the `otel-cf-workers`
// config). They depend on `@opentelemetry/sdk-trace-base` types only, never on a provider.

export {
  AI_CONTENT_ATTRIBUTES,
  AiContentStrippingSpanProcessor,
  stripAiContent,
  withoutAiContent,
} from './extensions/otel/ai-content';
export { FanoutSpanProcessor, addSpanProcessor } from './extensions/otel/span-fanout';
export { TagInjectorSpanProcessor } from './extensions/otel/span-processors';

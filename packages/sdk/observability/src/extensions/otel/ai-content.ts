//
// Copyright 2026 DXOS.org
//

import { type Attributes, type Context } from '@opentelemetry/api';
import { type ReadableSpan, type Span, type SpanProcessor } from '@opentelemetry/sdk-trace-base';

import { SpanAttributes } from '@dxos/effect';

/**
 * The prompt, the response, and the tool names. They stay on the span for the AI analytics sink,
 * which applies the content policy, and never leave the process with it: a trace backend gets the
 * model call's metadata.
 */
export const AI_CONTENT_ATTRIBUTES: ReadonlySet<string> = new Set([
  SpanAttributes.AI.input,
  SpanAttributes.AI.output,
  SpanAttributes.AI.tools,
]);

export const withoutAiContent = (attributes: Attributes): Attributes =>
  Object.fromEntries(Object.entries(attributes).filter(([key]) => !AI_CONTENT_ATTRIBUTES.has(key)));

/** A view of the span without its content attributes; the span itself is what other processors read. */
export const stripAiContent = (span: ReadableSpan): ReadableSpan =>
  Object.create(span, { attributes: { value: withoutAiContent(span.attributes), enumerable: true } });

/** Strips AI content from every span it forwards. Sits directly in front of an exporter. */
export class AiContentStrippingSpanProcessor implements SpanProcessor {
  constructor(private readonly _delegate: SpanProcessor) {}

  onStart(span: Span, parentContext: Context): void {
    this._delegate.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    this._delegate.onEnd(stripAiContent(span));
  }

  forceFlush(): Promise<void> {
    return this._delegate.forceFlush();
  }

  shutdown(): Promise<void> {
    return this._delegate.shutdown();
  }
}

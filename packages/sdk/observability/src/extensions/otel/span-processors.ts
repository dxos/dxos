//
// Copyright 2025 DXOS.org
//

import { type Context } from '@opentelemetry/api';
import { type ReadableSpan, type Span, type SpanProcessor } from '@opentelemetry/sdk-trace-base';

import { log } from '@dxos/log';

/**
 * Injects dynamic tags as attributes on every span.
 *
 * This is an `onStart`-only processor; `onEnd`/`shutdown`/`forceFlush` are no-ops
 * because this processor never holds pending work (delegates export to downstream
 * processors like BatchSpanProcessor).
 *
 * Use for tags that are not known at provider construction (e.g. identity
 * resolved asynchronously after login). For values known at startup, prefer
 * putting them on the `Resource` — see `extension.ts`.
 *
 * Failures in the tag provider are swallowed so they can never break span
 * recording (the processor is best-effort and runs on the startSpan hot path).
 */
export class TagInjectorSpanProcessor implements SpanProcessor {
  constructor(private readonly _getTags: () => Record<string, string>) {}

  onStart(span: Span, _parentContext: Context): void {
    let tags: Record<string, string>;
    try {
      tags = this._getTags();
    } catch (err) {
      log.catch(err);
      return;
    }
    for (const [key, value] of Object.entries(tags)) {
      span.setAttribute(key, value);
    }
  }

  onEnd(_span: ReadableSpan): void {}

  async shutdown(): Promise<void> {}

  async forceFlush(): Promise<void> {}
}

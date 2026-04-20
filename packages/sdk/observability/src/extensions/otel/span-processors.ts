//
// Copyright 2025 DXOS.org
//

import { type ReadableSpan, type SpanProcessor } from '@opentelemetry/sdk-trace-base';

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
 */
export class TagInjectorSpanProcessor implements SpanProcessor {
  constructor(private readonly _getTags: () => Record<string, string>) {}

  onStart(span: { setAttribute: (key: string, value: string) => void }): void {
    const tags = this._getTags();
    for (const [key, value] of Object.entries(tags)) {
      span.setAttribute(key, value);
    }
  }

  onEnd(_span: ReadableSpan): void {}

  async shutdown(): Promise<void> {}

  async forceFlush(): Promise<void> {}
}

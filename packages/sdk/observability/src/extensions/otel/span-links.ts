//
// Copyright 2026 DXOS.org
//

import { type Link, ROOT_CONTEXT, propagation, trace } from '@opentelemetry/api';

import { type StartSpanOptions } from '@dxos/tracing';

/**
 * Convert W3C link contexts ({@link StartSpanOptions.links}) into OTEL span links
 * ("related-to" edges that do not join the linked trace).
 */
export const toOtelLinks = (links: StartSpanOptions['links']): Link[] | undefined => {
  const converted = links
    ?.map((link) => {
      const linkCtx = propagation.extract(ROOT_CONTEXT, {
        traceparent: link.traceparent,
        tracestate: link.tracestate ?? '',
      });
      const spanContext = trace.getSpanContext(linkCtx);
      return spanContext ? { context: spanContext } : undefined;
    })
    .filter((link): link is Link => link !== undefined);
  return converted?.length ? converted : undefined;
};

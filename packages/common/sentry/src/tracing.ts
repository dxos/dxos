import { getContextFromEntry, log, LogLevel, LogProcessor } from "@dxos/log"
import { getCurrentHub } from "@sentry/browser";
import { Transaction, Span } from "@sentry/types";

export const configureTracing = () => {
  // Configure root transaction.
  TX = getCurrentHub().startTransaction({
    name: 'DXOS Core Tracing',
    op: 'dxos',
  });
  if(typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for(const span of SPAN_MAP.values()) {
        span.finish();
      }
      TX.finish();
    })
  }
  if(typeof process !== 'undefined') {
    process.on('exit', () => {
      for(const span of SPAN_MAP.values()) {
        span.finish();
      }
      TX.finish();
    })
  }

  log.runtimeConfig.processors.push(SENTRY_PROCESSOR);
}

let TX!: Transaction;
const SPAN_MAP = new Map<string, Span>();

export const SENTRY_PROCESSOR: LogProcessor = (config, entry) => {
  if (entry.level !== LogLevel.TRACE) {
    return;
  }
  const context = getContextFromEntry(entry);

  console.log({
    ...entry,
    context
  })

  if(context?.span) {
    switch(context.span.op) {
      case 'begin': {
        const id = context.span.id;
        if(!id || SPAN_MAP.has(id)) {
          return;
        }

        let parentSpan: Span = TX;
        if(context.span.parent) {
          parentSpan = SPAN_MAP.get(context.span.parent) || TX;
        }

        const span = parentSpan.startChild({
          op: entry.message,
          data: {
            ...entry,
            context
          },
        })
        SPAN_MAP.set(context.span.id, span);
        break
      }
      case 'end': {
        const span = SPAN_MAP.get(context.span.id);
        if(span) {
          span.finish();
          SPAN_MAP.delete(context.span.id);
        }
        break;
      }
    }
  }
}
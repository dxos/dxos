//
// Copyright 2023 DXOS.org
//

// NOTE: Browser only API. There is no node polyfill.

import { getCurrentHub } from '@sentry/browser';
import { Transaction, Span } from '@sentry/types';

import { runInContext, scheduleMicroTask, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { getContextFromEntry, log, LogLevel, LogProcessor } from '@dxos/log';

const REPORT_SPANS = false;

let TX!: Transaction;
const SPAN_MAP = new Map<string, Span>();
const SENTRY_INITIALIZED = new Trigger();
const ctx = new Context({ onError: (err) => log.warn('Unhandled error in Sentry context', err) });
ctx.maxSafeDisposeCallbacks = 10_000;

let tracingConfigured = false;

export const configureTracing = () => {
  tracingConfigured = true;
  runInContext(ctx, () => {
    // Configure root transaction.
    TX = getCurrentHub().startTransaction({
      name: 'DXOS Core Tracing',
      op: 'dxos',
    });
    invariant(TX, 'Failed to create trace');
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        finish();
      });
    }
    if (typeof process !== 'undefined') {
      process.on('exit', () => {
        finish();
      });
    }

    SENTRY_INITIALIZED.wake();
  });
};

export const finish = () => {
  for (const span of Array.from(SPAN_MAP.values()).reverse()) {
    try {
      span.finish();
    } catch (err) {
      log.warn('Failed to finish span', err);
    }
  }
  TX.finish();
};

export const SENTRY_PROCESSOR: LogProcessor = (config, entry) => {
  if (!tracingConfigured) {
    return;
  }

  const { message, level, error } = entry;
  const context = getContextFromEntry(entry);

  if (level !== LogLevel.TRACE) {
    return;
  }

  // NOTE: Make sure `entry` is not captured in this closure to avoid a memory leak.
  scheduleMicroTask(ctx, async () => {
    await SENTRY_INITIALIZED.wait();

    if (REPORT_SPANS && context?.span) {
      switch (context.span.command) {
        case 'begin': {
          const id = context.span.id;

          if (!id || SPAN_MAP.has(id)) {
            log.warn('Cannot begin span', id);
            return;
          }

          let parentSpan: Span = TX;
          if (context.span.parent) {
            parentSpan = SPAN_MAP.get(context.span.parent) ?? TX;
          }

          let logContext: string;
          try {
            logContext = JSON.stringify({ ...context, message, level, error });
          } catch (err) {
            logContext = JSON.stringify(context);
          }

          const span = parentSpan.startChild({
            op: message,
            data: {
              ...context.span.data,
              '@dxos/log': logContext,
            },
          });
          SPAN_MAP.set(context.span.id, span);
          break;
        }

        case 'end': {
          const span = SPAN_MAP.get(context.span.id);
          if (span) {
            span.setStatus(getSpanStatus(context.span.status));
            context.span.data && Object.entries(context.span.data).forEach(([key, value]) => span.setData(key, value));
            span.finish();
            SPAN_MAP.delete(context.span.id);
          } else {
            log.warn('Cannot end span', context.span.id);
          }
          break;
        }

        case 'update': {
          const span = SPAN_MAP.get(context.span.id);
          if (span) {
            context.span.data && Object.entries(context.span.data).forEach(([key, value]) => span.setData(key, value));
          } else {
            log.warn('Cannot update span', context.span.id);
          }
          break;
        }

        default: {
          log.warn('Unknown span command', context.span.command);
        }
      }
    }
  });
};

log.runtimeConfig.processors.push(SENTRY_PROCESSOR);

/**
 * @see https://develop.sentry.dev/sdk/event-payloads/span/#:~:text=this%20value%20explicitly.-,status,-Optional.%20Describes%20the
 */
const getSpanStatus = (status?: 'ok' | 'error') => {
  switch (status) {
    case 'ok':
      return 'ok';
    case 'error':
      return 'not_found';
  }
  return status ?? 'ok';
};

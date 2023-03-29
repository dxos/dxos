//
// Copyright 2023 DXOS.org
//

import { setUser, startTransaction } from '@sentry/node';
import { Transaction, Span } from '@sentry/types';

import { getContextFromEntry, log, LogLevel, LogProcessor } from '@dxos/log';

let TX!: Transaction;
const SPAN_MAP = new Map<string, Span>();

export const configureTracing = () => {
  // Configure root transaction.
  TX = startTransaction({
    name: 'DXOS Core Tracing',
    op: 'dxos'
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', finish);
  }
  if (typeof process !== 'undefined') {
    process.on('exit', finish);
  }

  log.runtimeConfig.processors.push(SENTRY_PROCESSOR);
};

export const finish = () => {
  for (const span of SPAN_MAP.values()) {
    span.finish();
  }
  TX.finish();
};

export const SENTRY_PROCESSOR: LogProcessor = (config, entry) => {
  if (entry.level !== LogLevel.TRACE) {
    return;
  }
  const context = getContextFromEntry(entry);

  if (entry.message === 'dxos.halo.identity' && context?.identityKey) {
    setUser({
      id: context.identityKey,
      username: context.profileName
    });
  }

  if (context?.span) {
    switch (context.span.command) {
      case 'begin': {
        const id = context.span.id;

        if (!id || SPAN_MAP.has(id)) {
          log.warn('Cannot begin span', id);
          return;
        }

        let parentSpan: Span = TX;
        if (context.span.parent) {
          parentSpan = SPAN_MAP.get(context.span.parent) || TX;
        }

        const span = parentSpan.startChild({
          op: entry.message,
          data: {
            ...context.span.data,
            '@dxos/log': { ...entry, context }
          }
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
};

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

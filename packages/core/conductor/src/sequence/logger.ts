//
// Copyright 2025 DXOS.org
//

import chalk from 'chalk';

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { log } from '@dxos/log';

import { type SequenceEvent, type SequenceLogger } from './types';

/* eslint-disable no-console */

// Force chalk colors on for tests.
chalk.level = 2;

// TODO(burdon): Factor out.
type ConsoleLogSignature = (message: string, arg?: any) => void;

interface Logger {
  log: ConsoleLogSignature;
}

const DEFAULT_LOGGER: Logger = { log: log.info };

/**
 * Buffered logger with event notifications.
 */
export class BufferedLogger implements Logger {
  private _messages: string[] = [];
  private readonly _changed = new Event<void>();

  get messages(): string[] {
    return this._messages;
  }

  get changed(): ReadOnlyEvent<void> {
    return this._changed;
  }

  clear() {
    this._messages = [];
    this._changed.emit();
  }

  log(message: string) {
    this._messages = [...this._messages, message];
    this._changed.emit();
  }
}

// TODO(burdon): Reconcile with ConsolePrinter.
export class SequenceLoggerAdapter implements SequenceLogger {
  constructor(private readonly logger: Logger = DEFAULT_LOGGER) {}

  log(event: SequenceEvent) {
    switch (event.type) {
      case 'begin':
        this.logger.log('begin', { invocationId: event.invocationId });
        break;
      case 'end':
        this.logger.log('end', { invocationId: event.invocationId });
        break;
      case 'step-start':
        this.logger.log('step-start', { invocationId: event.invocationId, step: event.step });
        break;
      case 'step-complete':
        this.logger.log('step-complete', { invocationId: event.invocationId, step: event.step });
        break;
      case 'message':
        this.logger.log('message', { invocationId: event.invocationId, message: event.message });
        break;
      case 'block':
        this.logger.log('block', { invocationId: event.invocationId, block: event.block });
        break;
    }
  }
}

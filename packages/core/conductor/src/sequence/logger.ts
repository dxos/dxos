//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, signal } from '@preact/signals-core';
import chalk from 'chalk';

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
 * Reactive bufferedlogger.
 */
export class BufferedLogger implements Logger {
  private _messages = signal<string[]>([]);

  get messages(): ReadonlySignal<string[]> {
    return this._messages;
  }

  clear() {
    this._messages.value = [];
  }

  log(message: string) {
    this._messages.value = [...this._messages.value, message];
  }
}

// TODO(burdon): Reconcile with DebugConsolePrinter.
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

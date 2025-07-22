//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, signal } from '@preact/signals-core';
import chalk from 'chalk';

import { ConsolePrinter } from '@dxos/ai';
import { type CleanupFn, combine } from '@dxos/async';
import { log } from '@dxos/log';

import { type SequenceEvent, type SequenceLogger, type SequenceMachine, type SequenceMachineState } from './machine';
import { type Sequence } from './sequence';

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

export const setLogger = (machine: SequenceMachine, logger: BufferedLogger): CleanupFn => {
  return combine(
    machine.begin.on(() => {
      logger.log('Starting...');
    }),
    machine.stepStart.on((step) => {
      const index = machine.sequence.steps.indexOf(step);
      logger.log(`Step ${index + 1} of ${machine.sequence.steps.length}`);
      logger.log(`Instructions: ${step.instructions}`);
    }),
    machine.stepComplete.on((step) => {
      const trace = machine.state.trace.find((t) => t.stepId === step.id);
      logger.log(`Complete: ${trace?.comment}`);
    }),
    machine.end.on(() => {
      logger.log('OK');
    }),
  );
};

export const setConsolePrinter = (machine: SequenceMachine, verbose = false): CleanupFn => {
  const printer = new ConsolePrinter();
  return combine(
    machine.begin.on(() => printTrace(machine.sequence, machine.state)),
    machine.stepStart.on((step) =>
      console.log(
        `\n${chalk.magenta(`${chalk.bold(`STEP ${machine.sequence.steps.indexOf(step) + 1} of ${machine.sequence.steps.length}:`)} ${step.instructions}`)}\n`,
      ),
    ),
    machine.stepComplete.on(() => printTrace(machine.sequence, machine.state)),
    machine.end.on(() => console.log('DONE')),
    verbose
      ? [
          machine.message.on((msg) => printer.printMessage(msg)),
          machine.block.on((block) => printer.printContentBlock(block)),
        ]
      : [],
  );
};

const BREAK_LINE = `\n${'_'.repeat(80)}\n`;

const printTrace = (sequence: Sequence, state: SequenceMachineState) => {
  console.group(chalk.bold('\nSequence'));
  sequence.steps.forEach((step) => {
    const traceStep = state.trace.find((t) => t.stepId === step.id);

    let color = chalk.gray; // Not executed.
    let bullet = '○';
    if (traceStep) {
      switch (traceStep.status) {
        case 'done':
          color = chalk.green;
          bullet = '✓';
          break;
        case 'skipped':
          color = chalk.blue;
          bullet = '↓';
          break;
        case 'bailed':
          color = chalk.red;
          bullet = '✗';
          break;
      }
    }

    console.log(color(`\n${bullet} ${step.instructions}`));
    if (traceStep?.comment) {
      console.log(chalk.white(`  ↳ ${traceStep.comment}`));
    }
  });

  console.groupEnd();
  console.log(BREAK_LINE);
};

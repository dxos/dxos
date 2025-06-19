//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, signal } from '@preact/signals-core';
import chalk from 'chalk';

import { ConsolePrinter } from '@dxos/ai';
import { type CleanupFn, combine } from '@dxos/async';

import { type Blueprint } from './blueprint';
import { type BlueprintMachine, type BlueprintMachineState } from './machine';

/* eslint-disable no-console */

// Force chalk colors on for tests.
chalk.level = 2;

export class Logger {
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

export const setLogger = (machine: BlueprintMachine, logger: Logger): CleanupFn => {
  return combine(
    machine.begin.on(() => {
      logger.log('Starting...');
    }),
    machine.stepStart.on((step) => {
      const index = machine.blueprint.steps.indexOf(step);
      logger.log(`Step ${index + 1} of ${machine.blueprint.steps.length}`);
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

export const setConsolePrinter = (machine: BlueprintMachine, verbose = false): CleanupFn => {
  const printer = new ConsolePrinter();
  return combine(
    machine.begin.on(() => printTrace(machine.blueprint, machine.state)),
    machine.stepStart.on((step) =>
      console.log(
        `\n${chalk.magenta(`${chalk.bold(`STEP ${machine.blueprint.steps.indexOf(step) + 1} of ${machine.blueprint.steps.length}:`)} ${step.instructions}`)}\n`,
      ),
    ),
    machine.stepComplete.on(() => printTrace(machine.blueprint, machine.state)),
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

const printTrace = (blueprint: Blueprint, state: BlueprintMachineState) => {
  console.group(chalk.bold('\nBlueprint'));
  blueprint.steps.forEach((step) => {
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

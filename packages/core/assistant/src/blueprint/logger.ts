//
// Copyright 2025 DXOS.org
//

import chalk from 'chalk';

import { ConsolePrinter } from '@dxos/ai';
import { type CleanupFn, combine } from '@dxos/async';

import { type Blueprint } from './blueprint';
import { type BlueprintMachine, type BlueprintMachineState } from './machine';

/* eslint-disable no-console */

// Force chalk colors on for tests.
chalk.level = 2;

export class Logger {
  private readonly messages: string[] = [];

  clear() {
    this.messages.length = 0;
  }

  log(message: string) {
    this.messages.push(message);
  }
}

export const setConsolePrinter = (machine: BlueprintMachine, extraLogging = false): CleanupFn => {
  const printer = new ConsolePrinter();
  return combine(
    extraLogging
      ? [
          machine.stepStart.on((step) =>
            console.log(
              `\n${chalk.magenta(`${chalk.bold(`STEP ${machine.blueprint.steps.indexOf(step) + 1} of ${machine.blueprint.steps.length}:`)} ${step.instructions}`)}\n`,
            ),
          ),
          machine.message.on((msg) => printer.printMessage(msg)),
          machine.block.on((block) => printer.printContentBlock(block)),
        ]
      : [],
    machine.begin.on(() => printTrace(machine.state, machine.blueprint)),
    machine.stepComplete.on(() => printTrace(machine.state, machine.blueprint)),
  );
};

const BREAK_LINE = `\n\n${'='.repeat(40)}`;

const printTrace = (state: BlueprintMachineState, blueprint: Blueprint) => {
  console.group(chalk.bold('\nBlueprint'));

  blueprint.steps.forEach((step, index) => {
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
      console.log(chalk.white(`    ↳ ${traceStep.comment}`));
    }
  });

  console.groupEnd();
  console.log(BREAK_LINE);
};

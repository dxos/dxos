//
// Copyright 2025 DXOS.org
//

import chalk from 'chalk';

import { ConsolePrinter } from '@dxos/ai';

import { type Blueprint } from './blueprint';
import { type BlueprintMachine, type BlueprintMachineState } from './machine';

/* eslint-disable no-console */

// Force chalk colors on for tests
chalk.level = 2;

export const setConsolePrinter = (machine: BlueprintMachine, extraLogging = false) => {
  const printer = new ConsolePrinter();
  if (extraLogging) {
    machine.stepStart.on((step) =>
      console.log(
        `\n${chalk.magenta(`${chalk.bold(`STEP ${machine.blueprint.steps.indexOf(step) + 1} of ${machine.blueprint.steps.length}:`)} ${step.instructions}`)}\n`,
      ),
    );
    machine.message.on((msg) => printer.printMessage(msg));
    machine.block.on((block) => printer.printContentBlock(block));
  }
  machine.begin.on(() => printTrace(machine.blueprint, machine.state));
  machine.stepComplete.on(() => printTrace(machine.blueprint, machine.state));
};

const printTrace = (blueprint: Blueprint, state: BlueprintMachineState) => {
  console.log('\n==============================================\n');
  console.log(chalk.bold('\nThe Blueprint:'));

  blueprint.steps.forEach((step, index) => {
    const traceStep = state.trace.find((t) => t.stepId === step.id);

    let color = chalk.gray; // Not executed
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
  console.log('\n');
  console.log('\n==============================================\n');
};

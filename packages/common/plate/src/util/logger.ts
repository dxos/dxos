//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';

const prefixEveryLine = (s: any, prefix: string) =>
  typeof s === 'string' ? s.toString().split('\n').join(`\n${prefix} `) : s;

export const info = (...args: any[]) =>
  console.log(chalk.cyan('[info]'), ...args.map((a) => prefixEveryLine(a, chalk.cyan('[info]'))));

export const warn = (...args: any[]) =>
  console.log(chalk.yellow('[warn]'), ...args.map((a) => prefixEveryLine(a, chalk.yellow('[warn]'))));

export const error = (...args: any[]) =>
  console.log(chalk.red('[error]'), ...args.map((a) => prefixEveryLine(a, chalk.red('[error]'))));

export const logger =
  (verbose: boolean) =>
  (...args: any[]) =>
    verbose ? info(...args) : undefined;

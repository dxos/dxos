//
// Copyright 2024 DXOS.org
//

import chalk from 'chalk';

export const info = (...args: any[]) => console.warn(chalk.cyan('[info]'), ...args);
export const warn = (...args: any[]) => console.warn(chalk.yellow('[warn]'), ...args);
export const err = (...args: any[]) => console.warn(chalk.red('[err]'), ...args);

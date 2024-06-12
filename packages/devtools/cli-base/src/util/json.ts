//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Offline MDN docs.

import chalk from 'chalk';

// TODO(burdon): Keys.
// TODO(burdon): Compare with jq.
export const stringify = (value: any): string => {
  if (typeof value === 'string') {
    if (value.length > 32 && value.match(/^\w+$/)) {
      return `"${chalk.green(value.slice(0, 8))}"`;
    }

    return `"${chalk.green(value)}"`;
  } else if (Array.isArray(value)) {
    return chalk.gray('[') + value.map((value) => stringify(value)) + chalk.gray(']');
  } else if (typeof value === 'object') {
    return (
      chalk.gray('{') +
      Object.entries(value)
        .map(([key, value]) => `${chalk.blue(key)}: ${stringify(value)}`)
        .join(', ') +
      chalk.gray('}')
    );
  } else if (value === true) {
    return chalk.green('true');
  } else if (value === false) {
    return chalk.red('false');
  } else {
    return String(chalk.cyan(value));
  }
};

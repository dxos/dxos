//
// Copyright 2023 DXOS.org
//

import { Hook } from '@oclif/core';
import chalk from 'chalk';

const hook: Hook<'command_not_found'> = async (options) => {
  console.log(chalk`{red Error}: Invalid command.`);
};

export default hook;

//
// Copyright 2023 DXOS.org
//

import { type Hook } from '@oclif/core';
import chalk from 'chalk';

//
// NOTE: May fail in dev mode due to build reason in packages depended upon by commands.
//
const hook: Hook<'command_not_found'> = async (params) => {
  const { id } = params;
  console.log(chalk`{red Error}: Invalid command: ${id}`);
};

export default hook;

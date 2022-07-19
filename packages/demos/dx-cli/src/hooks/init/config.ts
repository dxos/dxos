//
// Copyright 2022 DXOS.org
//

import { Hook } from '@oclif/core';

const hook: Hook<'init'> = async (options) => {
  console.log('init hook', options.id);
};

export default hook;

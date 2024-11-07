#!/usr/bin/env -S node --no-warnings

// Note: `npm publish` or `pnpm deploy` will change the default depending on the DX_ENVIRONMENT at time of invocation.
//
// Copyright 2024 DXOS.org
//

import { register } from 'module';
import { argv } from 'process';

register('extensionless', import.meta.url, { parentURL: import.meta.url, data: { argv1: argv[1] } });

const oclif = await import('@oclif/core');

process.env.DX_ENVIRONMENT ??= 'development';

await oclif.execute({ dir: import.meta.url });

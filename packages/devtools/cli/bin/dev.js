#!/usr/bin/env -S node --import=extensionless/register --loader ts-node/esm --no-warnings=ExperimentalWarning

// NOTE: Specify --no-warnings in production script.

// process.env.NODE_ENV = 'development';

//
// Copyright 2024 DXOS.org
//

import { execute, settings } from '@oclif/core';

if (process.env.DX_TRACK_LEAKS) {
  globalThis.wtf = require('wtfnode');
}

process.env.DX_ENVIRONMENT ??= 'development';

settings.debug = true;

await execute({ development: true, dir: import.meta.url });

// // In dev mode, always show stack traces.

// // Start the CLI.
// oclif.run().then(oclif.flush).catch(oclif.Errors.handle)

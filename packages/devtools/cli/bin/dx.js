#!/usr/bin/env -S node --import=extensionless/register --no-warnings

// Note: `npm publish` or `pnpm deploy` will change the default depending on the DX_ENVIRONMENT at time of invocation.
//
// Copyright 2024 DXOS.org
//

import { execute } from '@oclif/core';

process.env.DX_ENVIRONMENT ??= 'development';

await execute({ dir: import.meta.url });

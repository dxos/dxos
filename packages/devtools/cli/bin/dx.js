#!/usr/bin/env -S node --no-warnings

// Note: `npm publish` or `pnpm deploy` will change the default depending on the DX_ENVIRONMENT at time of invocation.
process.env.DX_ENVIRONMENT ??= 'development';

import { execute } from '@oclif/core';

await execute({ dir: import.meta.url });

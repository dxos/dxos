//
// Copyright 2026 DXOS.org
//

/**
 * Regenerates `dxplugin.schema.json`, which is checked in so an editor resolves it without running
 * any code; the drift test beside the schema keeps it equal to `Config2.Descriptor`.
 *
 * Usage: `pnpm vite-node -c scripts/dxplugin.vite.config.ts scripts/generate-dxplugin-schema.ts`
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Plugin } from '@dxos/app-framework';

const target = join(process.cwd(), 'packages/sdk/app-framework', Plugin.DXPLUGIN_SCHEMA_FILENAME);
writeFileSync(target, `${JSON.stringify(Plugin.descriptorJsonSchema(), null, 2)}\n`);
// eslint-disable-next-line no-console
console.log(`Wrote ${target}`);

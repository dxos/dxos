//
// Copyright 2026 DXOS.org
//

/**
 * Regenerates `packages/sdk/app-framework/dxplugin.schema.json` from `Config2.Descriptor`.
 *
 * The file is checked in so an editor can resolve it without running any code; this script (and the
 * drift test beside the schema) is what keeps it equal to the runtime schema.
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

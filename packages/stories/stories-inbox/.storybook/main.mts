//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { type PluginOption, type ViteDevServer } from 'vite';

import { fixturePath } from '@dxos/fixtures';

import { createConfig } from '../../../../tools/storybook-react/.storybook/main.ts';

export const stories = ['../src/**/*.stories.tsx'];

/**
 * Serves `@dxos/fixtures` corpora to browser stories as `/fixtures/<name>.json` — resolution is
 * node-only (git-ignored `testing/fixtures/`, `DX_FIXTURES_DIR` override), so the dev server reads
 * the file and the story fetches it. 404s when the fixture has not been pulled; stories gate on the
 * response and fall back to demo data, so CI (which never has a corpus) stays green.
 */
const fixturesPlugin = (): PluginOption => ({
  name: 'dx-fixtures',
  configureServer: (server: ViteDevServer) => {
    server.middlewares.use('/fixtures', (req, res, next) => {
      const match = /^\/([\w-]+)\.json$/.exec(req.url ?? '');
      const path = match ? fixturePath(match[1]) : undefined;
      if (!path) {
        return next();
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(readFileSync(path));
    });
  },
});

const config = createConfig({ stories });

// Compose rather than pass through `createConfig` — the shared factory defines its own `viteFinal`
// after spreading the base config, so a viteFinal passed in would be silently discarded.
const viteFinal: NonNullable<(typeof config)['viteFinal']> = async (viteConfig, options) => {
  const base = (await config.viteFinal?.(viteConfig, options)) ?? viteConfig;
  base.plugins = [...(base.plugins ?? []), fixturesPlugin()];
  return base;
};

export default { ...config, viteFinal };

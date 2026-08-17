//
// Copyright 2026 DXOS.org
//

import { fileURLToPath } from 'node:url';

import { defineConfig } from '../../../vite.base.config.ts';

const config = defineConfig({
  jsx: 'react',
  // The scripted delegation story drives a full supervisor -> sub-agent -> result round trip and
  // its own findByText bounds already total well past the default, so the test timeout has to
  // clear them or it can never pass regardless of how fast the run actually is.
  test: { node: { environment: 'jsdom' }, storybook: { timeout: 120_000 } },
});

/**
 * Hosts the Claude Agent SDK in whichever dev server is serving the stories, so `Agent.stories`
 * reaches it same-origin — no CORS, and no separate process for a test run to supervise. Turns are
 * scoped to the fixtures directory rather than the repo, bounding what the agent can read.
 */
const agentClaudePlugin = () => ({
  name: 'dx-agent-claude',
  // Imported dynamically: vite bundles this config with a CJS `require` for static imports, and
  // `@dxos/agent-claude` is ESM-only.
  configureServer: async (server: { middlewares: { use: (handler: any) => void } }) => {
    const { Middleware } = await import('@dxos/agent-claude');
    server.middlewares.use(Middleware.make({ cwd: fileURLToPath(new URL('./src/testing/fixtures', import.meta.url)) }));
  },
});

// Each vitest project (node, storybook, browser) runs its own vite server, and the storybook
// project's browser server — not the root one — is what serves the story to chromium.
const attach = (target: { plugins?: unknown[] }) => {
  target.plugins = [...(target.plugins ?? []), agentClaudePlugin()];
};

attach(config as { plugins?: unknown[] });
for (const project of config.test?.projects ?? []) {
  if (typeof project === 'object' && project !== null) {
    attach(project as { plugins?: unknown[] });
  }
}

export default config;

//
// Copyright 2026 DXOS.org
//

/**
 * Single commands on a code graph: show a package's exports, draw what depends on a service, clear the graph.
 *
 * @mdl packages/plugins/plugin-code-graph/PLUGIN.mdl test QA-2
 * @app composer-app via `moon run composer-app:serve -- --port 4173` with
 *   `DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true`,
 *   after `bun tools/code-index/bin/code-index.ts index`.
 */

import { create, prep, visible } from '../../../../tools/autocue/showcase/steps.mjs';

const SPEC = 'from plugin-code-graph/PLUGIN.mdl QA-2';

/** A beat for the viewer after the graph changes. */
const BEAT = 2_500;

const BAR = '[data-testid="code-graph-command"]';
const INPUT = '[data-testid="code-graph-command-input"]';

/** Types a command into the bar and waits for its outcome line to show more than the command itself. */
const command = async ({ demo, page }, text) => {
  await demo.fill({ selector: INPUT, value: text });
  await demo.press({ key: 'Enter' });
  await page.waitForFunction(
    (bar) => {
      const element = document.querySelector(bar);
      const outcome = element?.querySelector('[data-testid="code-graph-command-outcome"]');
      return element?.getAttribute('aria-busy') === 'false' && (outcome?.children.length ?? 0) > 1;
    },
    BAR,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(BEAT);
};

export const steps = [
  prep(['codeGraph']),
  {
    name: 'setup: open a code graph named Commands',
    setup: true,
    run: async ({ page }) => {
      await create(page, 'codeGraph', { name: 'Commands', ready: '[data-testid="code-graph-article"]' });
    },
  },
  {
    name: "Show a package's exports",
    run: async (context) => {
      const { demo, page } = context;
      await demo.caption({
        value: 'Open the command bar and ask for the ECHO exports',
        subtitle: SPEC,
        position: 'top',
      });
      await demo.click({ selector: '[data-testid="code-graph-command-open"]', label: 'Command' });
      await page.locator(INPUT).waitFor();
      await command(context, 'show me the ECHO package exports');
    },
  },
  {
    name: 'Draw what depends on a service',
    run: async (context) => {
      await context.demo.caption({ value: 'A question draws its answer', subtitle: SPEC, position: 'top' });
      await command(context, 'What depends on identity service in halo');
    },
  },
  {
    name: 'Clear the graph',
    run: async (context) => {
      const { demo, page } = context;
      await demo.caption({ value: 'Clear the graph', subtitle: SPEC, position: 'top' });
      await command(context, 'clear the graph');
      if (!(await visible(page.locator('[data-testid="code-graph-article"] >> text=press / for a command'), 10_000))) {
        throw new Error('the graph did not clear');
      }
    },
  },
];

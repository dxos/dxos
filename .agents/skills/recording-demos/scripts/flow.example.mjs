//
// Copyright 2026 DXOS.org
//

/**
 * A flow script for the driver's `run` op: one entry per QA step, executed in order against the live
 * page. Copy it next to the run's output (`/tmp/demo/flow.mjs`), not into the repo, and edit it freely:
 * every `run` re-imports the file, so a fix takes effect without restarting the browser.
 *
 * Each step receives `demo`, whose methods take the same arguments as the HTTP ops (so the cursor and
 * overlay behave the same), and `page`, the raw Playwright page for anything the ops do not cover. A
 * step that throws stops the run; the driver screenshots the page after every step either way.
 *
 * Keep the file free of imports: it runs from outside the workspace, where no package resolves.
 */

export const steps = [
  {
    name: 'Open the plugin registry',
    run: async ({ demo }) => {
      await demo.caption({ value: 'Step 1 — Open the plugin registry', subtitle: 'from plugin-chess/PLUGIN.mdl' });
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
    },
  },
  {
    name: 'Enable Chess',
    run: async ({ demo, page }) => {
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'chess' });
      await demo.click({ text: 'Chess', exact: true });
      // Judge the step by the screen, as a `.mdl` `expect:` would.
      await page.getByText('Chess', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
];

//
// Copyright 2026 DXOS.org
//

/**
 * Start a chess game and play the opening.
 *
 * @mdl packages/plugins/plugin-chess/PLUGIN.mdl test QA-1
 * @app composer-app via `moon run composer-app:serve` on :5173
 *
 * A flow script for the driver's `run` op: one entry per QA step, executed in order against the live
 * page. Copy it to `/tmp/demo/flow.mjs` while iterating: every `run` re-imports the file, so a fix takes
 * effect without restarting the browser. Once it runs end to end, commit it as `flows/<name>.mjs`.
 *
 * Each step receives `demo`, whose methods take the same arguments as the HTTP ops (so the cursor and
 * overlay behave the same), and `page`, the raw Playwright page for anything the ops do not cover. A
 * step that throws stops the run; the driver screenshots the page after every step either way.
 *
 * `done` is optional: a quick, read-only check that the step's outcome already holds. `run` with
 * `restart: true` replays the steps before `from` off camera and skips any whose `done` answers true, so
 * a step that creates something is not repeated on a profile that already has it. Write one for every
 * step that changes app state; a step without one is always replayed.
 *
 * `setup: true` marks off-camera preparation. `run` plays a countdown before the first step after the
 * setup ones: a play button (held until clicked in manual mode), then 3-2-1, so the take starts on cue.
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
    done: ({ page }) =>
      page.evaluate(() => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.chess' && plugin.enabled)),
    run: async ({ demo, page }) => {
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'chess' });
      await demo.click({ text: 'Chess', exact: true });
      // Judge the step by the screen, as a `.mdl` `expect:` would.
      await page.getByText('Chess', { exact: true }).first().waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
];

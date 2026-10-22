//
// Copyright 2026 DXOS.org
//

// Re-imported with the driver's cache-busting query, which reaches only the file it loads, so an edit to the shared
// steps is picked up by the next `run` too.
const { BEAT, makeSteps } = await import(`./plugin-template.mjs${new URL(import.meta.url).search}`);

/**
 * World Clock Plugin: the plugin the Composer Plugin project template builds, run from a partial spec, a feature map
 * and a plan instead. The agent finishes the spec, draws it, plans the work as tasks and builds the plugin in a sandbox
 * on EDGE until `dx registry publish --private` uploads it; the take ends with the reader installing World Clock from
 * Plugins → Registry, opening its Clocks page and adding two timezones.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-11
 * @app composer-app production bundle served by `vite preview` on :4173, talking to EDGE dev; see shogi-plugin.mjs
 *   for the build.
 */

const TIMEZONES = ['Asia/Tokyo', 'Europe/London'];

export const steps = makeSteps({
  template: 'World Clock Plugin',
  project: 'World Clock',
  plugin: 'World Clock',
  feature: 'Clocks page',
  finale: [
    {
      name: 'Open the Clocks page and add two timezones',
      narration: 'The spec, the diagram, the plan and the plugin it produced all live in one space.',
      run: async ({ demo, page }) => {
        await demo.caption({ value: 'Open its Clocks page and add two timezones' });
        // The plugin adds a group to the space's navtree beside the built-in ones.
        const sidebar = page.getByTestId('deck.sidebar');
        await sidebar.getByText('World Clock', { exact: true }).first().waitFor({ state: 'visible', timeout: 30_000 });
        await demo.click({ selector: '[data-testid="deck.sidebar"] >> text="Clocks"', label: 'Clocks' });
        const clocks = page.getByTestId('worldClock.clock');
        await clocks.first().waitFor({ state: 'visible', timeout: 30_000 });
        await page.waitForTimeout(BEAT * 2);
        const start = await clocks.count();
        for (const [index, timezone] of TIMEZONES.entries()) {
          await demo.click({ selector: '[data-testid="worldClock.add"]', label: 'Add clock' });
          await demo.click({ selector: '[data-testid="worldClock.new"] >> role=combobox', label: 'Timezone' });
          await demo.click({ selector: `role=option[name="${timezone}"]`, label: timezone });
          await demo.click({ selector: '[data-testid="worldClock.new"] [data-testid="save-button"]', label: 'Save' });
          // Counted, not indexed: the row is sorted west to east, so a new clock can land anywhere in it.
          await page.waitForFunction(
            (count) => document.querySelectorAll('[data-testid="worldClock.clock"]').length === count,
            start + index + 1,
            { timeout: 10_000 },
          );
          await page.waitForTimeout(BEAT);
        }
        await page.waitForTimeout(BEAT * 3);
      },
    },
  ],
});

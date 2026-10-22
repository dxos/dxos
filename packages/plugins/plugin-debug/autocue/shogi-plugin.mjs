//
// Copyright 2026 DXOS.org
//

// Re-imported with the driver's cache-busting query, which reaches only the file it loads, so an edit to the shared
// steps is picked up by the next `run` too.
const { BEAT, makeSteps } = await import(`./plugin-template.mjs${new URL(import.meta.url).search}`);

/**
 * Shogi Plugin: the agent finishes the partial spec, draws it, plans the work as tasks and builds the plugin in a
 * sandbox on EDGE until `dx registry publish --private` uploads it; the take ends with the reader installing Shogi from
 * Plugins → Registry, opening its Board page and playing 7g-7f.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-10
 * @app composer-app production bundle served by `vite preview` on :4173, talking to EDGE dev
 *
 *   export DX_EDGE_BASE_URL=https://dev.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   export DX_PLUGIN_TOOLCHAIN_COMMIT=<a main commit pkg.pr.new has published>
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * The template is offered only by a build that stamped its toolchain. Remote plugins install only from a bundle, and
 * EDGE must run registry-service; the dev environment enables plugin-debug (the template), Code (the spec article)
 * and Sandbox.
 */

/** A square of the plugin's board, by its shogi name (`7g`), as the spec's F-1.3 marks it. */
const square = (name) => `[data-testid="shogi.square"][data-square="${name}"]`;

export const steps = makeSteps({
  template: 'Shogi Plugin',
  project: 'Shogi',
  plugin: 'Shogi',
  feature: 'Board',
  finale: [
    {
      name: 'Open the board and play a move',
      narration: 'The spec, the diagram, the plan and the plugin it produced all live in one space.',
      run: async ({ demo, page }) => {
        await demo.caption({ value: 'Open its Board page and play 7g-7f' });
        // The plugin adds a group to the space's navtree beside the built-in ones.
        const sidebar = page.getByTestId('deck.sidebar');
        await sidebar.getByText('Shogi', { exact: true }).first().waitFor({ state: 'visible', timeout: 30_000 });
        await demo.click({ selector: '[data-testid="deck.sidebar"] >> text="Board"', label: 'Board' });
        await page.locator('[data-testid="shogi.square"]').nth(80).waitFor({ state: 'visible', timeout: 30_000 });
        await page.waitForTimeout(BEAT * 2);
        await demo.click({ selector: square('7g'), label: 'Pawn on 7g' });
        await page.waitForTimeout(BEAT / 2);
        await demo.click({ selector: square('7f'), label: '7f' });
        await page
          .locator(
            `${square('7f')} [data-testid="shogi.piece"][data-kind="pawn"], [data-testid="shogi.piece"][data-kind="pawn"]${square('7f')}`,
          )
          .first()
          .waitFor({ state: 'visible', timeout: 10_000 });
        await page.waitForTimeout(BEAT * 4);
      },
    },
  ],
});

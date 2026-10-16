//
// Copyright 2026 DXOS.org
//

/**
 * Create the Bramble Coffee Roasters space from its template, open its sales report, and switch between the
 * report's charts in the Charts companion.
 *
 * @mdl packages/plugins/plugin-sheet/PLUGIN.mdl test QA-3
 * @app composer-app dev server, `moon run composer-app:serve -- --port 5180`
 *
 *   export DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *
 * Record on a fresh profile: the take starts on the Home page of the default space a new identity is given.
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_000;

/** How long each chart stays on screen. */
const LINGER = 2_500;

const SPACE = 'Bramble Coffee Roasters';
const SHEET = 'Sales report';
const BAR_CHART = 'Bags sold by blend';
const PIE_CHART = 'Revenue by channel';

/** A navtree row by its label; other spaces' trees stay in the DOM, hidden, so only visible rows count. */
const TREE_ITEM = (label) => `[data-scope="tree-view"] [data-testid="treeItem.heading"]:visible:text-is("${label}")`;

/** The sidebar's title once the template space is open. */
const SPACE_TITLE = `text="${SPACE}" >> visible=true`;

/** A navtree branch row by its own heading; a parent's text includes its children's, so the heading is matched. */
const BRANCH = (label) =>
  `[data-scope="tree-view"][data-part="branch-control"]:visible:has(> [data-testid="treeItem.heading"]:text-is("${label}"))`;

/**
 * Opens a navtree branch by its chevron, the row's first child; clicking the heading would open it as a plank.
 * A tree still being seeded re-renders and can close the row again, so it checks once more after a pause.
 */
const expand = async (demo, page, label) => {
  const row = BRANCH(label);
  const isOpen = async () => (await page.locator(row).first().getAttribute('data-state')) === 'open';
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator(row).first().waitFor({ state: 'visible', timeout: 15_000 });
    if (!(await isOpen())) {
      await demo.click({ selector: `${row} > div >> nth=0`, label });
    }
    await page.waitForTimeout(BEAT);
    if (await isOpen()) {
      return;
    }
  }
  throw new Error(`navtree branch did not stay open: ${label}`);
};

/** A row of the Charts companion's list by its chart name. */
const CHART_ITEM = (name) => `[data-testid="chart-companion.item"]:has-text("${name}")`;

/** The chart drawn in the companion's lower pane. */
const PLOT = '[data-testid="deck.companion"] [role="img"]';

/** Waits until the companion draws a bar chart (`rect` marks) or a pie (`path` slices and no bars). */
const waitForPlot = (page, kind) =>
  page.waitForFunction(
    ({ selector, kind }) => {
      const plot = document.querySelector(selector);
      const bars = plot?.querySelectorAll('svg rect').length ?? 0;
      const slices = plot?.querySelectorAll('svg path').length ?? 0;
      return kind === 'bar' ? bars > 0 : bars === 0 && slices > 0;
    },
    { selector: PLOT, kind },
    { timeout: 10_000 },
  );

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices and close the help panel',
    setup: true,
    run: async ({ page }) => {
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (
        await notice
          .first()
          .waitFor({ state: 'visible', timeout: 8_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await notice.first().click();
      }
      await page.locator('[data-testid="deck.plank"][data-attendable-id$="/home"]').first().waitFor();
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Create the Bramble Coffee Roasters space',
    narration: 'Start a new space from the Bramble Coffee Roasters template.',
    done: async ({ page }) => (await page.locator(SPACE_TITLE).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: 'role=button[name="App menu"]', label: 'App menu' });
      await demo.click({ selector: '[data-testid="spacePlugin.createSpace"]', label: 'Create space' });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${SPACE}")`,
        label: SPACE,
      });
      await page.waitForTimeout(BEAT / 2);
      await demo.click({
        selector: '[data-testid="create-space-dialog"] button:has-text("Create")',
        label: 'Create',
      });
      await page.locator(SPACE_TITLE).first().waitFor({ timeout: 30_000 });
      // The template fills the tree section by section; Projects is the last to appear.
      await page.locator(BRANCH('Projects')).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the sales report',
    narration: 'Its sales report is a sheet with live formulas and styled header rows.',
    done: async ({ page }) => (await page.locator(`[data-testid="deck.plank"]:has-text("${BAR_CHART}")`).count()) > 0,
    run: async ({ demo, page }) => {
      await expand(demo, page, 'Collections');
      await expand(demo, page, 'Reference');
      await demo.click({ selector: `${TREE_ITEM(SHEET)} >> nth=0`, label: SHEET });
      await page.locator('.dx-grid [data-dx-grid-plane="grid"]').first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(BEAT * 1.5);
    },
  },
  {
    name: 'Show the bags sold chart',
    narration: 'The Charts companion lists the charts kept on the sheet, starting with bags sold by blend.',
    run: async ({ demo, page }) => {
      if (
        !(await page
          .locator('[data-testid="deck.companion.tab.charts"]')
          .isVisible()
          .catch(() => false))
      ) {
        await demo.click({ selector: 'role=button[name="Open companion"] >> nth=0', label: 'Open companion' });
      }
      await demo.click({ selector: '[data-testid="deck.companion.tab.charts"]', label: 'Charts' });
      await page.locator(CHART_ITEM(BAR_CHART)).waitFor({ timeout: 10_000 });
      await waitForPlot(page, 'bar');
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Switch to the revenue chart',
    narration: 'Choosing a chart draws it and selects its range in the sheet.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: CHART_ITEM(PIE_CHART), label: PIE_CHART });
      await waitForPlot(page, 'pie');
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Switch back to the bags sold chart',
    narration: 'Charts redraw from the live cells, so they follow every edit to the sheet.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: CHART_ITEM(BAR_CHART), label: BAR_CHART });
      await waitForPlot(page, 'bar');
      await page.waitForTimeout(LINGER);
    },
  },
  {
    name: 'Close on the charted report',
    narration:
      'Charts are stored with the sheet in your space, so they sync to every device and teammate, and work offline.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 8);
    },
  },
];

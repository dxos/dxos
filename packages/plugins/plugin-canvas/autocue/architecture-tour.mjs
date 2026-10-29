//
// Copyright 2026 DXOS.org
//

/**
 * A tour of the DXOS Architecture template: the Composer guide with its embedded diagram, then a drill
 * from Composer's overview down through EDGE and db-service to Subduction, and back up to the EDGE guide.
 *
 * @mdl packages/plugins/plugin-canvas/PLUGIN.mdl test QA-3
 * @app composer-app bundled dev build, served by `vite preview` on :4187
 *
 * Built and served from `packages/apps/composer-app` (Canvas is on in dev builds; elsewhere enable it
 * first, since the template is contributed only while it is):
 *
 *   export DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4187 --strictPort
 *
 * Record on a fresh profile: the take starts on the Home of the default space a new identity is given.
 */

const TEMPLATE = 'DXOS Architecture';

/** The boxes opened in turn, each a frame onto the diagram beneath it. */
const DRILL = ['EDGE', 'db-service', 'Subduction repl.'];

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

/** A navtree node by its own label: a leaf item or a branch's control, never a branch that only contains it. */
const node = (label, nth = 0) =>
  `[data-testid="deck.sidebar"] :is([data-part="item"],[data-part="branch-control"]):has(:text-is("${label}")) >> nth=${nth}`;

/** Expands a navtree branch if it is closed. */
const expand = async (page, label) => {
  const branch = page
    .locator(`[data-testid="deck.sidebar"] [role="treeitem"]:has(> [data-part="branch-control"] :text-is("${label}"))`)
    .first();
  await branch.waitFor({ state: 'attached', timeout: 15_000 });
  // A space that has just opened can re-render its tree under the first click, so retry until it holds;
  // each attempt waits for the state to settle, since a second click too soon closes it again.
  for (let attempt = 0; attempt < 3 && (await branch.getAttribute('aria-expanded')) !== 'true'; attempt++) {
    await branch.locator('[data-part="branch-indicator"]').first().click();
    await page
      .waitForFunction((element) => element.getAttribute('aria-expanded') === 'true', await branch.elementHandle(), {
        timeout: 3_000,
      })
      .catch(() => {});
  }
  if ((await branch.getAttribute('aria-expanded')) !== 'true') {
    throw new Error(`navtree branch did not open: ${label}`);
  }
};

/** Closes the help companion a new space opens with, so the take has the full width. */
const closeHelp = async (page) => {
  const close = page.locator('role=button[name="Close companion"]').first();
  if (
    await close.waitFor({ state: 'visible', timeout: 4_000 }).then(
      () => true,
      () => false,
    )
  ) {
    await close.click();
  }
};

const caption = (demo, value) => demo.caption({ value, subtitle: 'DXOS Architecture template' });

/** Scrolls the open document in visible steps by `steps` wheel ticks. */
const scrollDocument = async (page, steps) => {
  const editor = page.locator('[data-testid="composer.markdownRoot"]').first();
  const box = await editor.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 300));
  for (let step = 0; step < steps; step++) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(110);
  }
};

/** The drawing plank's scene. */
const SCENE = '[data-testid="deck.plank"] [data-testid="scene-view"]';

export const steps = [
  {
    name: 'Prep (off camera): create the space and open the navtree',
    setup: true,
    run: async ({ demo, page }) => {
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
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', hud: false });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', hud: false });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
        hud: false,
      });
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', hud: false });
      await page.locator(node('Collections')).waitFor({ state: 'visible', timeout: 60_000 });
      await closeHelp(page);
      await expand(page, 'Collections');
      await expand(page, 'Architecture');
      await page.waitForTimeout(BEAT);
      // Everything recorded so far is preparation; the take starts on the space as it now stands.
      await demo.cut();
    },
  },
  {
    name: 'Read the Composer guide',
    narration: 'Three guides introduce Composer, DXOS and EDGE, each embedding its diagram.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Three reading guides, each embedding its diagram');
      await demo.click({ selector: node('Composer', 0), label: 'Composer' });
      await page.locator('[data-testid="composer.markdownRoot"] [data-testid="scene-view"]').first().waitFor({
        state: 'visible',
        timeout: 20_000,
      });
      await page.waitForTimeout(BEAT * 2);
      await scrollDocument(page, 6);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the Composer drawing',
    narration: 'The Composer overview: twelve boxes, five of them frames onto the diagrams beneath.',
    run: async ({ demo, page }) => {
      await caption(demo, "Composer's overview: boxes open the diagrams beneath them");
      await demo.click({ selector: node('Overview', 0), label: 'Overview drawing' });
      await page.locator(SCENE).first().waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Drill into EDGE',
    narration: 'Drill into EDGE, then db-service, then its Subduction replication: four levels deep.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Drill down: EDGE, db-service, Subduction');
      for (const label of DRILL) {
        const box = `${SCENE} [data-node-id]:has-text("${label}")`;
        await page.locator(box).first().waitFor({ state: 'visible', timeout: 15_000 });
        await page.locator(box).first().hover();
        await demo.click({ selector: `${box} [data-testid="portal-open"] >> nth=0`, label });
        await page.waitForTimeout(BEAT * 1.5);
      }
    },
  },
  {
    name: 'Come back up',
    narration: 'Up returns through each level to the overview.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Back up to the overview');
      for (let level = 0; level < DRILL.length; level++) {
        await demo.click({ selector: '[data-testid="deck.plank"] [data-testid="toolbar-up"] >> nth=0', label: 'Up' });
        await page.waitForTimeout(BEAT);
      }
    },
  },
  {
    name: 'Read the EDGE guide',
    narration:
      'The EDGE guide ends with a device connecting. The diagrams are ordinary objects in a local-first space: they sync through EDGE and agents can read them like any document.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The EDGE guide: services, then a device connecting');
      await demo.click({ selector: node('EDGE', 0), label: 'EDGE' });
      await page.locator('[data-testid="composer.markdownRoot"]', { hasText: 'Reading the code' }).first().waitFor({
        timeout: 20_000,
      });
      await page.waitForTimeout(BEAT);
      await scrollDocument(page, 14);
      await page.waitForTimeout(BEAT * 4);
    },
  },
];

//
// Copyright 2026 DXOS.org
//

/**
 * Bramble story: Kai locks the Spring Blend. A wholesale customer's feedback leads to her contact, the
 * cupping on the calendar, the launch project, the roasts, and the protocol the blend is judged by.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-14
 * @app composer-app bundled dev build, served by `vite preview` on :4187
 *
 * Built and served from `packages/apps/composer-app`:
 *
 *   export DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4187 --strictPort
 *
 * Recorded light, at the driver's default viewport and resolution:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4187 --out <dir> --theme light
 *
 * Add `--scale 1` for a quick iteration take: the same layout at a quarter of the pixels, so it encodes
 * several times faster. Record the final take without it.
 *
 * Record on a fresh profile. Setup creates the space and expands the navtree off camera.
 *
 * Not yet run: written ahead of its first take, so selectors past the inbox are unverified.
 */

const TEMPLATE = 'Bramble Coffee Roasters';
const THREAD = 'Spring blend v1 - feedback';
const CONTACT = 'Priya Shah';
const EVENT = 'Spring Blend cupping - Hatch';
const PROJECT = 'Spring Blend Launch';
const PROTOCOL = 'Spring blend tasting protocol';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

/** A navtree node by its own label: a leaf item or a branch's control, never a branch that only contains it. */
const node = (label) =>
  `[data-testid="deck.sidebar"] :is([data-part="item"],[data-part="branch-control"]):has(:text-is("${label}")) >> nth=0`;

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

/** Closes the companion if one is open, so the take starts with the full width. */
const closeCompanion = async (page) => {
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

const caption = (demo, value) => demo.caption({ value, subtitle: 'Bramble Coffee Roasters' });

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
      await page.locator(node('Mailboxes')).waitFor({ state: 'visible', timeout: 60_000 });
      await closeCompanion(page);
      for (const branch of ['Mailboxes', 'Calendars', 'Collections', 'Roastery Handbook', 'Projects', 'Database']) {
        await expand(page, branch);
      }
      await page.waitForTimeout(BEAT);
      // Everything recorded so far is preparation; the take starts on the space as it now stands.
      await demo.cut();
    },
  },
  {
    name: 'The ask',
    narration: 'Kai roasts for Bramble, six weeks from launching a new espresso blend. Hatch Bakery has tasted v1.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Hatch Bakery has tasted the Spring Blend');
      await demo.click({ selector: node('Inbox'), label: 'Inbox' });
      await page
        .locator('[data-testid="inbox.conversation.row"]', { hasText: THREAD })
        .first()
        .waitFor({ timeout: 15_000 });
      await page.waitForTimeout(BEAT);
      await demo.click({
        selector: `[data-testid="inbox.conversation.row"]:has-text("${THREAD}") >> text=Re: ${THREAD}`,
        label: THREAD,
      });
      await page.locator('[data-testid="conversation.summary"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Who is asking',
    narration: "Priya runs Hatch's coffee program. Her card shows the cupping already booked.",
    run: async ({ demo, page }) => {
      await caption(demo, 'Who is asking: Priya at Hatch');
      const card = page
        .locator('[data-testid="deck.companion"] [data-scope="card"][data-part="root"]', { hasText: CONTACT })
        .first();
      const avatar = card.locator('[data-testid="row.contact-avatar"]').first();
      await avatar.hover();
      const popover = page.locator('[role="dialog"]', { hasText: CONTACT }).first();
      if (
        !(await popover.waitFor({ state: 'visible', timeout: 2_000 }).then(
          () => true,
          () => false,
        ))
      ) {
        await avatar.click();
      }
      await popover.waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT * 1.5);
      await demo.click({ selector: '[role="dialog"] button[aria-label="Actions"] >> nth=0', label: 'Actions' });
      await demo.click({ selector: 'role=menuitem[name="Open"]', label: 'Open' });
      await page
        .locator('[data-testid="deck.plank"]', { hasText: 'Hatch Bakery' })
        .first()
        .waitFor({ timeout: 15_000 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'When we will know',
    narration: 'The cupping is eight days out.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The cupping, eight days out');
      await demo.click({ selector: `[data-testid="deck.plank"] :text("${EVENT}") >> nth=0`, label: EVENT });
      await page.getByText(EVENT).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 1.5);
    },
  },
  {
    name: 'What has to happen first',
    narration: 'The launch project: what is done, what is blocked, and a brief waiting for an agent.',
    run: async ({ demo, page }) => {
      await caption(demo, 'What has to land before launch');
      await demo.click({ selector: node(PROJECT), label: PROJECT });
      await page.locator('[data-testid="projectsPlugin.tab.tasks"]').first().waitFor({ timeout: 15_000 });
      await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'The roasts',
    narration: 'The roast log: v2 has been cupped, v3 is next. That is the batch Priya will taste.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The roast log: v3 is next');
      await expand(page, 'Roast Log');
      await demo.click({
        selector:
          '[data-testid="deck.sidebar"] [role="treeitem"]:has(> [data-part="branch-control"] :text-is("Roast Log")) [data-part="item"]:has(:text-is("Kanban")) >> nth=0',
        label: 'Roast Log board',
      });
      await page.getByText('Spring Blend v3').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'How it will be judged',
    narration: 'And the protocol the blend is judged by, with the launch tasks inside it.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The tasting protocol, with the launch tasks inside');
      await demo.click({ selector: node(PROTOCOL), label: PROTOCOL });
      await page
        .locator('[data-testid="composer.markdownRoot"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close',
    narration:
      "The roastery's mail, calendar, projects and roasts live on its own devices and sync through EDGE, and an agent can pick up the brief.",
    run: async ({ demo, page }) => {
      await caption(demo, 'One space for the whole roastery');
      await demo.click({ selector: node('Inbox'), label: 'Inbox' });
      await page.locator('[data-testid="inbox.conversation.row"]').first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(BEAT * 4);
    },
  },
];

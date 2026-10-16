//
// Copyright 2026 DXOS.org
//

/**
 * Fieldstone vignette: what the agents did this week. The release project's Gantt, one agent run's chat, and the failed task where a person stepped in.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-5
 * @app composer-app bundled dev build, served by `vite preview` on :4187
 *
 * Built and served from `packages/apps/composer-app` (plugin-debug, which contributes the template, is on
 * in dev builds):
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
 * Record on a fresh profile. Setup creates the space, opens the navtree branches the vignette uses and cuts,
 * so the take starts on the space as it then stands.
 *
 * Not yet run: written ahead of its first take, so selectors past the setup are unverified.
 */

const TEMPLATE = 'Fieldstone Labs';
const PROJECT = 'Cairn 1.8: remote cache v2';

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

/** Collapses a navtree branch if it is open. */
const collapse = async (page, label) => {
  const branch = page
    .locator(`[data-testid="deck.sidebar"] [role="treeitem"]:has(> [data-part="branch-control"] :text-is("${label}"))`)
    .first();
  if ((await branch.count()) > 0 && (await branch.getAttribute('aria-expanded')) === 'true') {
    await branch.locator('[data-part="branch-indicator"]').first().click();
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

const caption = (demo, value) => demo.caption({ value, subtitle: 'Fieldstone Labs' });

/** The companion's message card for `sender` whose body starts with `text`. */
const messageCard = (page, sender, text) =>
  page
    .locator('[data-testid="deck.companion"] [data-scope="card"][data-part="root"]', { hasText: sender })
    .filter({ hasText: text })
    .first();

/** Scrolls the mailbox in visible steps until the conversation row naming `subject` is in its upper half. */
const scrollToThread = async (page, subject) => {
  const box = await page.locator('[data-testid="inbox.mailbox"]').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const row = page.locator('[data-testid="inbox.conversation.row"]', { hasText: subject }).first();
  for (let step = 0; step < 80; step++) {
    const target = (await row.isVisible().catch(() => false)) ? await row.boundingBox() : undefined;
    if (target && target.y < box.y + box.height * 0.45) {
      return;
    }
    await page.mouse.wheel(0, 160);
    await page.waitForTimeout(70);
  }
  throw new Error(`thread not found: ${subject}`);
};

/** Opens a project and its Tasks tab. */
const openProject = async (demo, page, name) => {
  await demo.click({ selector: node(name), label: name });
  await page.locator('[data-testid="projectsPlugin.tab.tasks"]').first().waitFor({ timeout: 15_000 });
  await demo.click({ selector: '[data-testid="projectsPlugin.tab.tasks"] >> nth=0', label: 'Tasks' });
  await page.waitForTimeout(BEAT);
};

/** Clicks a task row's title in the open project. */
const openTask = async (demo, page, title) => {
  await demo.click({ selector: `[data-testid="deck.plank"] :text-is("${title}") >> nth=0`, label: title });
  await page.waitForTimeout(BEAT * 2);
};

/** Opens a project artifact (a document) from the project's Overview tab. */
const openArtifact = async (demo, page, name) => {
  await demo.click({ selector: '[data-testid="projectsPlugin.tab.overview"] >> nth=0', label: 'Overview' });
  await demo.click({ selector: `[data-testid="projectsPlugin.artifacts"] :text("${name}") >> nth=0`, label: name });
  await page.locator('[data-testid="composer.markdownRoot"]').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(BEAT * 2);
};

/** Hovers the avatar on the companion's message card for `sender`, opening their card. */
const hoverSender = async (page, sender) => {
  const avatar = page
    .locator('[data-testid="deck.companion"] [data-scope="card"][data-part="root"]', { hasText: sender })
    .first()
    .locator('[data-testid="row.contact-avatar"]')
    .first();
  await avatar.scrollIntoViewIfNeeded();
  await avatar.hover();
  const popover = page.locator('[role="dialog"]', { hasText: sender }).first();
  if (
    !(await popover.waitFor({ state: 'visible', timeout: 2_000 }).then(
      () => true,
      () => false,
    ))
  ) {
    await avatar.click();
  }
  await popover.waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(BEAT * 2);
  await page.keyboard.press('Escape');
};

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
      for (const branch of ['Projects']) {
        await expand(page, branch);
      }
      await page.waitForTimeout(BEAT);
      // Everything recorded so far is preparation; the take starts on the space as it now stands.
      await demo.cut();
    },
  },
  {
    name: 'Open the release project',
    narration: "Most of Fieldstone's release work is done by agents. Here is the Cairn 1.8 project.",
    run: async ({ demo, page }) => {
      await caption(demo, 'Cairn 1.8: most of the work is done by agents');
      await openProject(demo, page, PROJECT);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'See the runs on the Gantt',
    narration: 'Each Builder and Reviewer run is a lane, across the week.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Every agent run, on the Gantt');
      await demo.click({ selector: '[data-testid="projectsPlugin.pipeline"] >> nth=0', label: 'Pipeline' });
      await page.getByText('Builder:').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Look inside a run',
    narration: 'Open one run: the brief, the tool calls, and the pull request it opened.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Inside a run: the brief, the tool calls, the pull request');
      await openTask(demo, page, 'Fix cache-key collision on concurrent writes');
    },
  },
  {
    name: 'Find where a person stepped in',
    narration: 'Where a run failed twice, Omar stepped in, and the rollout waits on it.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Where a person stepped in');
      await openTask(demo, page, 'Integration tests against R2');
      await page.waitForTimeout(BEAT * 2);
    },
  },
];

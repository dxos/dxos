//
// Copyright 2026 DXOS.org
//

/**
 * Alien Labs vignette: after the incident. The Okapi postmortem with its timeline sheet embedded, the on-call runbook with its escalation drawing, and the decision log.
 *
 * @mdl packages/plugins/plugin-debug/PLUGIN.mdl test QA-7
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

const TEMPLATE = 'Alien Labs';

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
  // A reveal lands a beat after the navigation that caused it, so wait for it before closing.
  await page
    .waitForFunction(
      (label) =>
        [...document.querySelectorAll('[data-testid="deck.sidebar"] [role="treeitem"]')].some(
          (item) =>
            item.querySelector(':scope > [data-part="branch-control"]')?.textContent?.trim() === label &&
            item.getAttribute('aria-expanded') === 'true',
        ),
      label,
      { timeout: 2_000 },
    )
    .catch(() => {});
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

const caption = (demo, value) => demo.caption({ value, subtitle: 'Alien Labs' });

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
  const tasks = page.locator('[data-testid="projectsPlugin.tab.tasks"]').first();
  // With one of its artifacts open, the project's plank stays on the artifact; its breadcrumb goes back.
  if (
    !(await tasks.waitFor({ state: 'visible', timeout: 3_000 }).then(
      () => true,
      () => false,
    ))
  ) {
    await demo.click({ selector: `[data-testid="deck.plank"] :text-is("${name}") >> nth=0`, label: name });
  }
  await tasks.waitFor({ timeout: 15_000 });
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
  // Opening an artifact reveals it under Database in the navtree; the tour keeps Database shut.
  await collapse(page, 'Database');
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

/** Opens a navtree item and waits for its plank to show `text`. */
const open = async (demo, page, label, text = label) => {
  await demo.click({ selector: node(label), label });
  await page.locator('[data-testid="deck.plank"]', { hasText: text }).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(BEAT * 2);
};

/** Scrolls the open document in visible steps until `text` is in the upper half of the plank. */
const scrollToText = async (page, text, { exact = false } = {}) => {
  const plank = page.locator('[data-testid="deck.plank"]').first();
  const box = await plank.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const target = plank.getByText(text, { exact }).first();
  for (let step = 0; step < 60; step++) {
    const at = (await target.isVisible().catch(() => false)) ? await target.boundingBox() : undefined;
    if (at && at.y < box.y + box.height * 0.5) {
      break;
    }
    await page.mouse.wheel(0, 160);
    await page.waitForTimeout(70);
  }
  // Off the text, into the plank's empty margin: a pointer left on a link chip opens its preview.
  await page.mouse.move(box.x + 24, box.y + box.height / 2);
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
      for (const branch of ['Collections', 'Incidents', 'Handbook']) {
        await expand(page, branch);
      }
      await page.waitForTimeout(BEAT);
      // Everything recorded so far is preparation; the take starts on the space as it now stands.
      await demo.cut();
    },
  },
  {
    name: 'The postmortem',
    narration: 'After the Okapi incident, the team wrote it up: root cause, what changed, who owns each action.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The postmortem');
      await open(demo, page, 'Okapi cache-corruption postmortem');
    },
  },
  {
    name: 'The timeline',
    narration: 'The timeline is a sheet, embedded in the write-up.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The timeline: a sheet inside the document');
      // The embed's own label sits at its foot, so scroll to the heading above it to keep the whole sheet in view.
      await scrollToText(page, 'Timeline', { exact: true });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'What on-call does now',
    narration: 'The runbook changed too, with the escalation path drawn in.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The runbook, with its escalation drawing');
      await open(demo, page, 'On-call runbook');
      await scrollToText(page, 'On-call escalation');
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'What the team decided',
    narration: "And the decision it led to, in the team's decision log.",
    run: async ({ demo, page }) => {
      await caption(demo, 'The decision log');
      await open(demo, page, 'Decision log');
      await scrollToText(page, 'compare-and-set');
      // A full entry: context, decision, alternatives and consequences.
      await page.waitForTimeout(BEAT * 4);
    },
  },
];

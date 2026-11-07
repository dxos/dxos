//
// Copyright 2026 DXOS.org
//

/**
 * Alice acts on Bob from his avatar: the viewers list, Jump to his selection, one row per tab of his, and the
 * Members companion with Go to. Recorded side by side.
 *
 * @mdl packages/plugins/plugin-space/PLUGIN.mdl test QA-3
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE signaling)
 *
 * Also walks QA-4 (a peer's sessions). A flow for `pair.mjs`, not `driver.mjs`: every step receives both peers.
 * Built and served from `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-space/autocue/presence-jump.mjs --out /tmp/presence --width 1280
 *
 * Keep the file free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Launch';
const AGENDA = 'Agenda';
const PLAN = 'Launch plan';
const TIMEOUT = 60_000;

const PLAN_TEXT = [
  'Goals',
  'Timeline',
  'Owners',
  'Pricing',
  'Docs',
  'Support',
  'Marketing',
  'Risks',
  'Metrics',
  'Rollback',
  'Retrospective',
]
  .map((section, index) =>
    [
      `## ${section}`,
      '',
      ...Array.from({ length: 6 }, (_, line) => `${section} note ${line + 1}: what we decided and who owns it.`),
      '',
    ].join('\n'),
  )
  .join('\n');

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

/** The workspace segment of a pair-chain URL (`/w/<workspace>/…`). */
const workspaceOf = (page) => {
  const [anchor, workspace] = new URL(page.url()).pathname.split('/').filter(Boolean);
  return anchor === 'w' ? workspace : undefined;
};

const currentWorkspace = (page) => page.getByTestId('navtree.workspace.visible');
const objectLink = (page, name) =>
  currentWorkspace(page).getByTestId('spacePlugin.object').filter({ hasText: name }).first();
const plank = (page) => page.getByTestId('deck.plank').first();
const textbox = (page) => plank(page).getByTestId('composer.markdownRoot').getByRole('textbox');
const scrollTop = (page) =>
  plank(page)
    .locator('.cm-scroller')
    .evaluate((element) => element.scrollTop);
const sidebar = (page) => page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
const avatar = (page) => plank(page).getByTestId('spacePlugin.presence.member').first();
const viewerRows = (page) => page.getByTestId('spacePlugin.presence.row').filter({ visible: true });
const sessionRows = (page) => page.getByTestId('spacePlugin.presence.session').filter({ visible: true });

/** Expands a navtree row unless it is already open; a row with no children yet keeps its caret disabled. */
const expandRow = async (row) => {
  const toggle = row.locator('[data-part="branch-trigger"]').first();
  await toggle.waitFor({ state: 'attached', timeout: TIMEOUT });
  if ((await toggle.getAttribute('data-state')) === 'open') {
    return;
  }
  await row.hover();
  await waitFor(() => toggle.isEnabled(), { what: 'the row to become expandable' });
  await toggle.click();
};

/** First-run chrome that would cover the content: the privacy notice and any open companion. */
const clearChrome = async ({ page }) => {
  const notice = page.getByTestId('org.dxos.plugin.observability.notice');
  if (await notice.isVisible().catch(() => false)) {
    await notice.getByTestId('toast.close').click();
  }
  const closeCompanion = page.getByTestId('plankHeading.closeCompanion').filter({ visible: true });
  for (let attempt = 0; attempt < 10 && (await closeCompanion.count()) > 0; attempt++) {
    await closeCompanion
      .first()
      .click({ timeout: 2_000 })
      .catch(() => {});
  }
  if (
    (await sidebar(page)
      .getAttribute('data-state')
      .catch(() => null)) === 'expanded'
  ) {
    await sidebar(page).getByTestId('deck.toggleComplementarySidebar').click();
  }
};

/** Creates a named document in the current space and fills it with `text`. */
const createDocument = async (page, name, text) => {
  await currentWorkspace(page).getByTestId('spacePlugin.createObject').first().click();
  await page.getByTestId('create-object-form.type.org.dxos.type.document').click();
  const dialog = page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
  const form = page.getByTestId('create-object-form');
  await waitFor(async () => (await form.isVisible()) || !(await dialog.isVisible()), { what: 'the object form' });
  const named = await form.isVisible();
  if (named) {
    await form.getByLabel('Name').fill(name);
    await dialog.getByTestId('save-button').click();
    await form.waitFor({ state: 'detached', timeout: TIMEOUT });
  }
  // Without the form, a document is created at once as "New document" and renamed through its navtree actions.
  // Either way, wait for its plank to replace the last one before typing.
  const title = named ? name : 'New document';
  await objectLink(page, title).waitFor({ timeout: TIMEOUT });
  await plank(page).getByText(title).first().waitFor({ timeout: TIMEOUT });
  await textbox(page).waitFor({ timeout: TIMEOUT });
  await textbox(page).fill(text);
  // `fill` leaves the whole text selected, which the other peer would see as Alice's selection.
  await page.keyboard.press('ControlOrMeta+Home');
  // A document takes its first heading as its name, so typing usually renames it already.
  const renamed = await objectLink(page, name)
    .waitFor({ timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!renamed) {
    const untitled = objectLink(page, title);
    await untitled.hover();
    await untitled
      .getByTestId(/navtree\.treeItem\.actionsLevel\d+/)
      .first()
      .click();
    await page.getByTestId('spacePlugin.renameObject').last().click();
    const field = page.locator('[data-scope="popover"][data-part="content"]').getByRole('textbox', { name: 'Name' });
    await field.fill(name);
    await field.press('Escape');
  }
  await objectLink(page, name).waitFor({ timeout: TIMEOUT });
  await clearChrome({ page });
};

/** Scrolls the editor with the mouse wheel until `text` is rendered; the editor only renders lines in view. */
const scrollToText = async (page, text) => {
  const line = plank(page).getByText(text, { exact: false }).first();
  const box = await plank(page).locator('.cm-scroller').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let tick = 0; tick < 60 && !(await line.isVisible()); tick++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(120);
  }
  await line.scrollIntoViewIfNeeded();
  return line;
};

/** Opens the viewers list from Bob's avatar unless it is already open. */
const openViewers = async (alice) => {
  if ((await viewerRows(alice.page).count()) === 0) {
    await alice.click(avatar(alice.page));
  }
  await viewerRows(alice.page).first().waitFor({ timeout: TIMEOUT });
};

/** Clicks a Jump and waits for Alice's editor to take focus with its view settled. */
const jump = async (alice, row, sleep) => {
  const action = row.getByTestId('spacePlugin.presence.jump');
  await action.waitFor({ state: 'attached', timeout: TIMEOUT });
  await row.hover();
  await alice.click(action);
  await waitFor(() => textbox(alice.page).evaluate((element) => element === document.activeElement), {
    what: 'Alice’s editor to take focus',
  });
  await sleep(1_000);
  return scrollTop(alice.page);
};

export const steps = [
  {
    name: 'Both peers boot with their own identity',
    setup: true,
    run: async ({ peers }) => {
      // The notice arrives a moment after boot; give it the chance to appear before clearing it.
      await peers.alice.page.waitForTimeout(3_000);
      await Promise.all([clearChrome(peers.alice), clearChrome(peers.bob)]);
      await Promise.all(
        [
          [peers.alice, 'Alice'],
          [peers.bob, 'Bob'],
        ].map(([{ page }, displayName]) =>
          page.evaluate(
            (displayName) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName }),
            displayName,
          ),
        ),
      );
    },
  },
  {
    name: `Alice creates "${SPACE}" with two documents and invites Bob`,
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
      const { page } = alice;
      await page.getByTestId('spacePlugin.addSpace').click();
      await page.getByTestId('spacePlugin.createSpace').click();
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await save.click();
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await page.getByText(SPACE).first().waitFor({ timeout: TIMEOUT });

      await createDocument(page, AGENDA, '# Agenda\n\nWalk through the launch plan together.\n');
      await createDocument(page, PLAN, `# Launch plan\n\n${PLAN_TEXT}`);

      const sharedWorkspace = workspaceOf(page);
      await expandRow(currentWorkspace(page).getByTestId('spacePlugin.settings').first());
      await currentWorkspace(page)
        .getByTestId('spacePlugin.members')
        .first()
        .getByTestId('treeItem.heading')
        .first()
        .click();
      const invitationCode = alice.nextConsoleValue('invitationCode');
      const authCode = alice.nextConsoleValue('authCode');
      await page.getByTestId('membersContainer.createInvitation.more').click();
      await page.getByTestId('membersContainer.inviteOne').click();
      await page.getByTestId('membersContainer.createInvitation').click();

      await bob.page.getByTestId('spacePlugin.addSpace').click();
      await bob.page.getByTestId('spacePlugin.joinSpace').click();
      const input = bob.page.getByTestId('space-invitation-input');
      await input.fill(await invitationCode);
      await bob.page.keyboard.press('Enter');
      const pin = bob.page.locator("[data-testid='space-auth-code-input']:visible");
      await pin.waitFor({ timeout: TIMEOUT });
      await pin.locator('input').first().click();
      await bob.page.keyboard.type(await authCode, { delay: 50 });
      await bob.page.getByTestId('space-invitation-authenticator-next').click();
      await waitFor(() => workspaceOf(bob.page) === sharedWorkspace, { what: "Bob to reach Alice's space" });

      // Alice goes back to the plan; Bob opens it too.
      await objectLink(page, PLAN).click();
      await waitFor(async () => (await textbox(page).innerText()).includes('Launch plan'), {
        what: 'Alice to open the plan',
      });
      await clearChrome(bob);
      await expandRow(currentWorkspace(bob.page).getByTestId('spacePlugin.collectionsSection').first());
      await objectLink(bob.page, PLAN).click();
      await waitFor(async () => (await textbox(bob.page).innerText()).includes('Launch plan'), {
        what: 'Bob to open the plan',
      });
      await textbox(page).click();
      await page.keyboard.press('ControlOrMeta+Home');

      // A second tab of Bob's is a second session of his, with its caret in the pricing section.
      const tab = await bob.context.newPage();
      await tab.goto(bob.page.url());
      const tabTextbox = tab
        .getByTestId('deck.plank')
        .first()
        .getByTestId('composer.markdownRoot')
        .getByRole('textbox');
      await tabTextbox.waitFor({ timeout: TIMEOUT });
      await clearChrome({ page: tab });
      await (await scrollToText(tab, 'Pricing note 2')).click();
      await bob.page.bringToFront();
      for (const toast of await bob.page.getByTestId('toast.close').filter({ visible: true }).all()) {
        await toast.click().catch(() => {});
      }
      await Promise.all([clearChrome(alice), clearChrome(bob)]);
      await avatar(page).waitFor({ timeout: 45_000 });
    },
  },
  {
    name: 'Bob selects a line far down the plan',
    subtitle: 'QA-3 step 1: his avatar is in the header of Alice’s plank',
    run: async ({ peers: { alice, bob } }) => {
      await bob.click(await scrollToText(bob.page, 'Metrics note 3'), { clickCount: 2 });
      await avatar(alice.page).waitFor({ timeout: TIMEOUT });
    },
    pace: 3_000,
  },
  {
    name: 'Alice clicks Bob’s avatar',
    subtitle: 'QA-3 step 2: the viewers list opens with his row highlighted',
    run: async ({ peers: { alice } }) => {
      await openViewers(alice);
      await waitFor(async () => (await viewerRows(alice.page).first().getAttribute('aria-selected')) === 'true', {
        what: 'Bob’s row to be highlighted',
      });
    },
    pace: 2_500,
  },
  {
    name: 'Alice clicks Jump; her view goes to Bob’s selection',
    subtitle: 'QA-3 step 3',
    run: async ({ peers: { alice }, sleep }) => {
      const top = await jump(alice, viewerRows(alice.page).first(), sleep);
      if (top < 400) {
        throw new Error(`Alice's view did not move to Bob's selection (scrollTop ${top})`);
      }
    },
    pace: 3_000,
  },
  {
    name: 'Alice shows each session; Bob’s two tabs list under him',
    subtitle: 'QA-4 step 3: each named by its device, with a dot for whether it moved lately',
    run: async ({ peers: { alice } }) => {
      await openViewers(alice);
      await alice.click(alice.page.getByTestId('spacePlugin.presence.showSessions').filter({ visible: true }));
      await waitFor(async () => (await sessionRows(alice.page).count()) === 2, { what: 'two session rows' });
    },
    pace: 3_000,
  },
  {
    name: 'Each tab has its own Jump',
    subtitle: 'QA-4 step 4',
    run: async ({ peers: { alice }, sleep }) => {
      const tops = [];
      for (const index of [0, 1]) {
        await openViewers(alice);
        tops.push(await jump(alice, sessionRows(alice.page).nth(index), sleep));
        await sleep(1_000);
      }
      if (Math.abs(tops[0] - tops[1]) < 200) {
        throw new Error(`the two sessions' Jumps landed in the same place (${tops.join(', ')})`);
      }
    },
    pace: 2_500,
  },
  {
    name: 'Alice opens “See everyone in this space”',
    subtitle: 'QA-3 step 4: Members lists Bob under the plan',
    run: async ({ peers: { alice } }) => {
      await openViewers(alice);
      await alice.click(alice.page.getByTestId('spacePlugin.presence.seeEveryone').filter({ visible: true }));
      await sidebar(alice.page).getByTestId('spacePlugin.presence.row').first().waitFor({ timeout: TIMEOUT });
    },
    pace: 3_000,
  },
  {
    name: 'Bob opens the agenda; Alice goes to it from Members',
    subtitle: 'Go to opens what a peer views when it is not open here',
    run: async ({ peers: { alice, bob } }) => {
      await bob.click(objectLink(bob.page, AGENDA));
      const goTo = sidebar(alice.page).getByTestId('spacePlugin.presence.goTo').first();
      await goTo.waitFor({ state: 'attached', timeout: TIMEOUT });
      await goTo
        .locator('xpath=ancestor::*[contains(@class,"dx-row")][1]')
        .hover()
        .catch(() => {});
      await alice.click(goTo);
      await waitFor(async () => (await textbox(alice.page).innerText()).includes('Walk through'), {
        what: 'the agenda in Alice’s deck',
      });
    },
    pace: 8_000,
  },
];

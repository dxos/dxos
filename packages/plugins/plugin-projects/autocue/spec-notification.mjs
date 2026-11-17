//
// Copyright 2026 DXOS.org
//

/**
 * A comment's notification opens the spec the thread is on. The project "Chess" holds two specs; Bob comments on the
 * second, goes back to the first, and opens Alice's reply from his notifications.
 *
 * @title A comment's notification opens its spec
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-13
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE preview, for the
 *   notifications inbox)
 *
 * A flow for `pair.mjs`, not `driver.mjs`: every step receives both peers. Built and served from
 * `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-projects/autocue/spec-notification.mjs --out /tmp/pair --width 1280
 *
 * Keep the file free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Games';
const PROJECT = 'Chess';
const FIRST = 'Rules';
const SECOND = 'Openings';
const FIRST_TEXT = 'Each piece moves as the laws of chess allow.';
const SECOND_TEXT = 'The plugin teaches a few classic openings.';
const QUESTION = 'Which openings ship first?';
const ANSWER = 'The Italian and the Sicilian.';
const TIMEOUT = 60_000;
// How long a result stays on screen once it shows, so a viewer can find it.
const HOLD = 2_000;

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

/** A navtree row with no children yet keeps its toggle disabled until they arrive. */
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

const sidebar = (page) => page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
const notificationsTab = (page) => page.locator('[role="tab"][aria-label="Notifications"]').first();

/** First-run chrome that would cover the content: the privacy notice, any open companion and the sidebar. */
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

const plank = (page) => page.getByTestId('deck.plank').first();
const dialog = (page) => page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
const notes = (page) => plank(page).getByTestId('projectsPlugin.outline');
const specDocument = (page) => plank(page).getByTestId('projectsPlugin.spec.document');
const specText = (page) => specDocument(page).locator('.cm-content').first();
const specLine = (page, text) => specDocument(page).locator('.cm-line', { hasText: text }).first();
const specToolbar = (page) => plank(page).locator('[role="toolbar"]:has([data-testid="projectsPlugin.tab.spec"])');
const specPicker = (page) => plank(page).getByTestId('projectsPlugin.specPicker').first();
const companion = (page) => page.getByTestId('deck.companion').filter({ visible: true }).first();

const hold = ({ page }) => page.waitForTimeout(HOLD);

/** A row of the current workspace's navtree, by its heading. */
const treeRow = (page, heading) =>
  currentWorkspace(page)
    .getByTestId('treeItem.heading')
    .filter({ hasText: new RegExp(`^${heading}$`) })
    .first()
    .locator('xpath=ancestor::*[@role="treeitem"][1]');

/** Closes the companion, which narrows the plank until the spec toolbar overflows. */
const closeCompanion = async (peer) => {
  const close = peer.page.getByTestId('plankHeading.closeCompanion').filter({ visible: true });
  if ((await close.count()) > 0) {
    await peer.click(close.first());
  }
};

/**
 * Opens the project on its Specs tab from Projects in the navtree. A peer that just joined lists projects only once
 * its replica has indexed them, so the wait for the row is long.
 */
const openProject = async (peer) => {
  const { page } = peer;
  const projects = treeRow(page, 'Projects');
  await projects.waitFor({ timeout: 120_000 });
  await expandRow(projects);
  await peer.click(treeRow(page, PROJECT).getByTestId('treeItem.heading').first());
  await plank(page).getByTestId('projectsPlugin.tab.spec').waitFor({ timeout: TIMEOUT });
  await closeCompanion(peer);
  await peer.click(plank(page).getByTestId('projectsPlugin.tab.spec'));
  await specText(page).waitFor({ timeout: TIMEOUT });
};

/** Waits for the Specs tab to show the spec `name`: its dropdown names it and its text holds `text`. */
const expectSpec = async (page, name, text) => {
  await waitFor(async () => (await specPicker(page).innerText()).trim() === name, {
    what: `the spec dropdown to read "${name}"`,
  });
  await specLine(page, text).waitFor({ timeout: TIMEOUT });
};

/** Picks the spec `name` from the Specs tab's dropdown. */
const pickSpec = async (peer, name, text) => {
  const { page } = peer;
  await peer.click(specPicker(page));
  await peer.click(page.locator('[role="menu"] [role^="menuitem"]').filter({ hasText: name }).first());
  await expectSpec(page, name, text);
};

/** Adds the spec `name` from the dropdown, or the empty tab's button, and types `text` into it. */
const addSpec = async (peer, name, text) => {
  const { page } = peer;
  const picker = specPicker(page);
  if (await picker.isVisible().catch(() => false)) {
    await peer.click(picker);
    await peer.click(page.locator('[role="menu"] [data-testid="projectsPlugin.addSpec"]').first());
  } else {
    await peer.click(plank(page).getByTestId('projectsPlugin.addSpec').first());
  }
  await peer.click(dialog(page).getByPlaceholder('Name'));
  await peer.type(name);
  await peer.click(dialog(page).getByTestId('save-button'));
  await dialog(page).waitFor({ state: 'detached', timeout: TIMEOUT });
  await closeCompanion(peer);
  await waitFor(async () => (await specPicker(page).innerText()).trim() === name, { what: `"${name}" to open` });
  await peer.click(specText(page));
  await peer.type(text, { delay: 25 });
  await specLine(page, text).waitFor({ timeout: TIMEOUT });
};

/** Opens the plank's companion on its Comments tab. */
const openComments = async (peer) => {
  const { page } = peer;
  const open = plank(page).getByTestId('plankHeading.companion').filter({ visible: true });
  if ((await open.count()) > 0) {
    await peer.click(open.first());
  }
  // A wide companion labels its tabs, and the labelled ones carry no test id.
  await peer.click(
    page
      .locator('[data-testid="deck.companion.tab.comments"], [role="tab"]:has-text("Comments")')
      .filter({ visible: true })
      .first(),
  );
};

/** A thread in the companion's Comments, by a message in it. */
const thread = (page, text) => companion(page).getByTestId('thread').filter({ hasText: text }).first();

/** Comments `comment` on the spec's line `text`, selected through the editor's own state and anchored from the toolbar. */
const commentOnLine = async (peer, text, comment) => {
  const { page } = peer;
  await peer.click(specLine(page, text));
  const selected = await page.evaluate((text) => {
    for (const content of document.querySelectorAll('[data-testid="projectsPlugin.spec.document"] .cm-content')) {
      const view = content.cmTile?.view;
      const doc = view?.state.doc;
      for (let number = 1; doc && number <= doc.lines; number++) {
        const line = doc.line(number);
        const at = line.text.indexOf(text);
        if (at >= 0) {
          view.dispatch({ selection: { anchor: line.from + at, head: line.from + at + text.length } });
          view.focus();
          return true;
        }
      }
    }
    return false;
  }, text);
  if (!selected) {
    throw new Error(`no line "${text}" in the spec`);
  }
  const action = specToolbar(page).getByTestId('comments.comment.add');
  if (await action.isVisible()) {
    await peer.click(action);
  } else {
    await peer.click(specToolbar(page).getByTestId('toolbar.overflow'));
    await peer.click(page.locator('[role="menu"] [data-testid="comments.comment.add"]'));
  }
  const box = page
    .locator('[data-testid=thread][aria-current="location"]')
    .getByTestId('thread.reply')
    .getByRole('textbox');
  await box.waitFor({ timeout: TIMEOUT });
  await peer.click(box);
  await peer.type(comment, { delay: 25 });
  await page.keyboard.press('Enter');
  await thread(page, comment).waitFor({ timeout: TIMEOUT });
};

export const steps = [
  {
    name: 'Both peers boot with their own identity and name',
    setup: true,
    run: async ({ peers }) => {
      // The notice arrives a moment after boot.
      await peers.alice.page.waitForTimeout(3_000);
      for (const peer of [peers.alice, peers.bob]) {
        await clearChrome(peer);
        await peer.page.evaluate(
          (displayName) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName }),
          peer.name,
        );
      }
    },
  },
  {
    name: `Alice creates "${SPACE}" and invites Bob`,
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
      const { page } = alice;
      const entryWorkspace = workspaceOf(page);
      await page.getByTestId('spacePlugin.addSpace').click();
      await page.getByTestId('spacePlugin.createSpace').click();
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await page.getByTestId('create-space-dialog').getByTestId('save-button').click();
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await waitFor(
        () => {
          const workspace = workspaceOf(page);
          return !!workspace && workspace !== entryWorkspace;
        },
        { what: `"${SPACE}" to open` },
      );
      await currentWorkspace(page).getByText(SPACE).first().waitFor({ timeout: TIMEOUT });

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
      await bob.page.getByTestId('space-invitation-input').fill(await invitationCode);
      await bob.page.keyboard.press('Enter');
      const pin = bob.page.locator("[data-testid='space-auth-code-input']:visible");
      await pin.waitFor({ timeout: TIMEOUT });
      await pin.locator('input').first().click();
      await bob.page.keyboard.type(await authCode, { delay: 50 });
      await bob.page.getByTestId('space-invitation-authenticator-next').click();
      await waitFor(() => workspaceOf(bob.page) === sharedWorkspace, { what: "Bob to reach Alice's space" });
      await clearChrome(alice);
      await clearChrome(bob);
    },
  },
  {
    name: `Alice creates the project "${PROJECT}" with the specs "${FIRST}" and "${SECOND}"`,
    setup: true,
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(currentWorkspace(page).getByTestId('spacePlugin.createObject').first());
      await alice.click(page.getByTestId('create-object-form.type.org.dxos.type.project'));
      await alice.click(page.getByTestId('create-project-panel.name-input'));
      await alice.type(PROJECT);
      await alice.click(dialog(page).getByTestId('save-button'));
      await page.getByTestId('create-project-panel.name-input').waitFor({ state: 'detached', timeout: TIMEOUT });
      await notes(page).waitFor({ timeout: TIMEOUT });
      // A new project opens its Help companion.
      await closeCompanion(alice);
      await alice.click(plank(page).getByTestId('projectsPlugin.tab.spec'));
      await addSpec(alice, FIRST, FIRST_TEXT);
      await addSpec(alice, SECOND, SECOND_TEXT);
      await pickSpec(alice, FIRST, FIRST_TEXT);
    },
  },
  {
    name: `Bob opens "${PROJECT}" on its Specs tab, picks "${SECOND}" and comments "${QUESTION}" on its line.`,
    subtitle: 'QA-13 step 1',
    run: async ({ peers: { bob } }) => {
      await openProject(bob);
      await pickSpec(bob, SECOND, SECOND_TEXT);
      await openComments(bob);
      await commentOnLine(bob, SECOND_TEXT, QUESTION);
      await hold(bob);
    },
  },
  {
    name: `Bob picks "${FIRST}" from the spec dropdown.`,
    subtitle: 'QA-13 step 2',
    run: async ({ peers: { bob } }) => {
      await closeCompanion(bob);
      await pickSpec(bob, FIRST, FIRST_TEXT);
      await hold(bob);
    },
  },
  {
    name: `Alice opens "${PROJECT}" on "${SECOND}" and replies "${ANSWER}" to Bob's thread.`,
    subtitle: 'QA-13 step 3',
    run: async ({ peers: { alice, bob } }) => {
      await pickSpec(alice, SECOND, SECOND_TEXT);
      await openComments(alice);
      const scope = thread(alice.page, QUESTION);
      await scope.waitFor({ timeout: TIMEOUT });
      await alice.click(scope.getByTestId('thread.reply').last());
      await alice.type(ANSWER, { delay: 25 });
      await alice.page.keyboard.press('Enter');
      await scope.getByText(ANSWER).waitFor({ timeout: TIMEOUT });
      await bob.page
        .locator('[role="tab"][aria-label="Notifications"][data-badge="1"]')
        .waitFor({ timeout: 2 * TIMEOUT });
      await bob.click(notificationsTab(bob.page));
      await bob.page.getByTestId('messenger.notification').filter({ hasText: SECOND }).first().waitFor();
      await hold(bob);
    },
  },
  {
    name: `Bob opens the "${SECOND}" notification.`,
    subtitle: 'QA-13 step 4',
    run: async ({ peers: { bob } }) => {
      const { page } = bob;
      const notification = page.getByTestId('messenger.notification').filter({ hasText: SECOND }).first();
      // The tile's title opens the notification; its attachment chip would open only the object.
      await bob.click(notification.getByText(SECOND).first());
      await expectSpec(page, SECOND, SECOND_TEXT);
      // The deck draws the Comments companion only when it fits, and beside an open sidebar it does not.
      await bob.click(sidebar(page).getByTestId('deck.toggleComplementarySidebar'));
      await thread(page, ANSWER).waitFor({ timeout: TIMEOUT });
      await hold(bob);
      await hold(bob);
    },
  },
];

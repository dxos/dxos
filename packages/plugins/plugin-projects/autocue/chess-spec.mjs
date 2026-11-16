//
// Copyright 2026 DXOS.org
//

/**
 * Alice and Bob write the spec for a Composer chess plugin together: a draft typed at the same time, bullets turned
 * into features in the text while Bob's Board fills, a question Bob leaves before he goes, an agent that fills in
 * requirements, types and operations while Alice watches, and Bob back to her answer, the thread's agent and the
 * dependencies he picks in a feature's form.
 *
 * @title Write a chess plugin's spec together
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-12
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE preview, for the agent
 *   and the notifications inbox)
 *
 * A flow for `pair.mjs`, not `driver.mjs`: every step receives both peers. Built and served from
 * `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-projects/autocue/chess-spec.mjs --out /tmp/pair --width 1280
 *
 * The agent runs on a live model, so its step takes minutes and plays fast-forwarded. The `feat` block kind and the
 * Board come from plugin-code's Software package, a Labs plugin outside dev builds, so setup turns it on for both
 * peers. Keep the file free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Games';
const PROJECT = 'Chess';
const SPEC = 'Chess plugin';
const TIMEOUT = 60_000;
// How long a result stays on screen once it shows, so a viewer can find it.
const HOLD = 2_000;

const SUMMARY = 'A two-player chess game plugin for Composer.';
const BOARD = 'Two players play on a shared board.';
const MOVE = 'A player makes a move on their turn.';
const LOBBY = 'A player starts a game from the lobby.';
const RULES = 'Move Validation checks every move against the rules.';
const SYNC = 'Games are saved and reach every peer.';
const ASK =
  "Turn this draft into the spec for a Composer chess plugin: a feature for each remaining bullet, requirements for every feature, and the plugin's types (down to pieces and squares) and operations as type and op blocks. Keep the features already written as they are, where they are.";
/** The features the draft names, and the one Bob's dependency needs; the agent names the rest as it likes. */
const FEATURES = ['Gameboard', 'Make Move', 'Start Game', 'Move Validation'];
const FEATURE_COUNT = 5;
// The agent runs on a live model for minutes; its stretch plays this many times faster in the cut.
const AGENT_SPEED = 10;

const MOVE_QUESTION = 'Who checks a move, the board or the engine?';
const MOVE_ANSWER = 'Move Validation does; the agent just added it.';
// The comment agent's name, as a thread's `@` menu offers it.
const AGENT = 'Kai';
// Names the feature: the agent's rewrite in step 7 can move the thread's anchor off Make Move's text.
const MOVE_ASK = 'add a requirement to Make Move that a finished game takes no more moves';
const DEPENDENCIES = ['Gameboard', 'Move Validation'];

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
  const sidebar = page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
  if ((await sidebar.getAttribute('data-state').catch(() => null)) === 'expanded') {
    await sidebar.getByTestId('deck.toggleComplementarySidebar').click();
  }
};

const codeEnabled = (page) =>
  page.evaluate(() =>
    globalThis.composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.code' && plugin.enabled),
  );

/**
 * Turns on plugin-code from the registry's Labs list, then returns to where the page was. The reload back can boot
 * with it off (the switch had not yet persisted, or a slow activation auto-disabled it), so it retries until it holds.
 */
const enableCode = async ({ page }) => {
  const back = page.url();
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${new URL(back).origin}/w/dxos:registry`);
    await page.getByTestId('pluginRegistry.labs').click({ timeout: TIMEOUT });
    const item = page.getByTestId('pluginList.org.dxos.plugin.code');
    await item.waitFor({ timeout: TIMEOUT });
    if (!(await item.locator('input[type="checkbox"]').isChecked())) {
      await item.locator('[data-scope="switch"][data-part="root"]').click();
    }
    await waitFor(() => codeEnabled(page), { what: 'plugin-code to turn on' });
    await page.waitForTimeout(2_000);
    await page.goto(back);
    await page.getByTestId('deck.plank').first().waitFor({ timeout: TIMEOUT });
    await page.waitForTimeout(5_000);
    if (await codeEnabled(page)) {
      return;
    }
  }
  throw new Error('plugin-code would not stay on');
};

const plank = (page) => page.getByTestId('deck.plank').first();
const dialog = (page) => page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
const notes = (page) => plank(page).getByTestId('projectsPlugin.outline');
const specDocument = (page) => plank(page).getByTestId('projectsPlugin.spec.document');
/** The spec's own text; each block form inside it has editors of its own. */
const specText = (page) => specDocument(page).locator('.cm-content').first();
const specLine = (page, text) => specDocument(page).locator('.cm-line', { hasText: text }).first();
const specToolbar = (page) => plank(page).locator('[role="toolbar"]:has([data-testid="projectsPlugin.tab.spec"])');
const companion = (page) => page.getByTestId('deck.companion').filter({ visible: true }).first();
const editable = (field) => field.locator('[contenteditable="true"]');
/** The form of the feature titled `name` in the spec's text. */
const featureForm = (page, name) =>
  specDocument(page)
    .locator('[data-testid="spec-block"][data-kind="feat"]')
    .filter({ has: page.getByTestId('_title').filter({ hasText: name }) })
    .first();
/** The Board's card for the feature titled `name`. */
const boardCard = (page, name) => companion(page).getByTestId('feature-card').filter({ hasText: name }).first();

const caretOf = (scope, name) =>
  scope.locator('.cm-collab-selectionCaret', {
    has: scope.page().locator('.cm-collab-selectionName', { hasText: name }),
  });

const expectCaret = (scope, name, what) =>
  waitFor(async () => (await caretOf(scope, name).count()) > 0, {
    timeout: 30_000,
    what: `${name}'s caret in ${what}`,
  });

const hold = ({ page }) => page.waitForTimeout(HOLD);

/** The project's address, taken when Alice creates it, where Bob's tab reopens. */
let projectUrl;

/** A row of the current workspace's navtree, by its heading. */
const treeRow = (page, heading) =>
  currentWorkspace(page)
    .getByTestId('treeItem.heading')
    .filter({ hasText: new RegExp(`^${heading}$`) })
    .first()
    .locator('xpath=ancestor::*[@role="treeitem"][1]');

/**
 * Opens the project from Projects in the navtree. A peer that just joined lists projects only once its replica has
 * indexed them, so the wait for the row is long.
 */
const openProject = async (peer) => {
  const { page } = peer;
  const projects = treeRow(page, 'Projects');
  await projects.waitFor({ timeout: 120_000 });
  await expandRow(projects);
  await peer.click(treeRow(page, PROJECT).getByTestId('treeItem.heading').first());
  await plank(page).getByTestId('projectsPlugin.tab.spec').waitFor({ timeout: TIMEOUT });
};

/** Closes the companion, which narrows the plank until the spec toolbar overflows. */
const closeCompanion = async (peer) => {
  const close = peer.page.getByTestId('plankHeading.closeCompanion').filter({ visible: true });
  if ((await close.count()) > 0) {
    await peer.click(close.first());
  }
};

/** Opens the plank's companion on the tab `testId` names, or labels `label` when it is wide enough to label them. */
const openCompanionTab = async (peer, testId, label) => {
  const { page } = peer;
  const open = plank(page).getByTestId('plankHeading.companion').filter({ visible: true });
  if ((await open.count()) > 0) {
    await peer.click(open.first());
  }
  // A wide companion labels its tabs, and the labelled ones carry no test id.
  await peer.click(
    page.locator(`[data-testid="${testId}"], [role="tab"]:has-text("${label}")`).filter({ visible: true }).first(),
  );
};

/** Opens Board in the Structure companion. */
const openBoard = async (peer) => {
  const { page } = peer;
  await openCompanionTab(peer, 'deck.companion.tab.spec-structure', 'Structure');
  await peer.click(companion(page).getByTestId('spec-companion.view.kanban'));
  await companion(page)
    .locator('[data-testid="spec-companion.structure"][data-view="kanban"]')
    .waitFor({ timeout: TIMEOUT });
};

const openComments = (peer) => openCompanionTab(peer, 'deck.companion.tab.comments', 'Comments');

/**
 * Turns the bullet holding `text` into the feature `name`: `name /feat` typed over the bullet makes the block in its
 * place, and the bullet's words go into the feature's description.
 */
const makeFeature = async (peer, text, name) => {
  const { page } = peer;
  await page.waitForTimeout(500);
  await peer.click(specLine(page, text));
  // With forms drawn above it, a click can land a line off, and the DOM caret can disagree with the editor's, so the
  // bullet's words are selected through the spec editor's own state.
  const selected = await page.evaluate((bullet) => {
    for (const content of document.querySelectorAll('.cm-content')) {
      const view = content.cmTile?.view;
      const doc = view?.state.doc;
      for (let number = 1; doc && number <= doc.lines; number++) {
        const line = doc.line(number);
        const at = line.text.indexOf(`- ${bullet}`);
        if (at >= 0) {
          const from = line.from + at + 2;
          view.dispatch({ selection: { anchor: from, head: from + bullet.length }, scrollIntoView: true });
          view.focus();
          return true;
        }
      }
    }
    return false;
  }, text);
  if (!selected) {
    throw new Error(`no bullet "${text}" in the spec`);
  }
  await page.waitForTimeout(300);
  await peer.type(`${name} /feat`);
  // Enter before an option is selected, or in the menu's first moments, inserts a newline instead of the block.
  const option = page.locator('.cm-tooltip-autocomplete [aria-selected="true"]');
  await option.waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await option.waitFor({ timeout: 1_000 });
  await page.keyboard.press('Enter');
  const description = editable(featureForm(page, name).getByTestId('_prose').first());
  await description.waitFor({ timeout: TIMEOUT });
  await page.waitForTimeout(400);
  // The form's wrapper takes the pointer first, so the click is forced through to the description's own line.
  await peer.click(description.locator('.cm-line').first(), { force: true });
  await peer.type(text);
};

/** The spec's text, as the space holds it; the editor draws only the lines in view. */
const specContent = (page) =>
  page.evaluate(async () => {
    const { dxos } = globalThis;
    let text = '';
    for (const space of dxos.spaces()) {
      for (const spec of await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.projects.spec'))).run()) {
        text += (await spec.content?.load?.())?.content ?? '';
      }
    }
    return text;
  });

/** The spec text's mdl blocks: each one's kind, its title after the key, and its requirement count. */
const blocksOf = (text) =>
  [...text.matchAll(/```mdl\n([\s\S]*?)```/g)].map(([, body]) => {
    const [head = ''] = body.split('\n');
    const [, kind = '', rest = ''] = head.match(/^([\w-]+)\s*(.*)$/) ?? [];
    return {
      kind,
      title: rest.replace(/^[^\s:]+:\s*/, '').trim(),
      requirements: (body.match(/^\s+req\b/gm) ?? []).length,
    };
  });

const featuresOf = async (page) => blocksOf(await specContent(page)).filter(({ kind }) => kind === 'feat');

const requirementsOf = async (page, name) =>
  (await featuresOf(page)).find(({ title }) => title === name)?.requirements ?? 0;

/** The chat is working while its last turn shows a status rather than its totals. */
const agentBusy = async (page) =>
  /Preparing|Contacting|Thinking|Generating|Calling tool|Running/.test((await companion(page).innerText()).slice(-400));

/** Opens the Assistant in the companion and sends `text` with the skill picked first from the prompt's `/` menu. */
const ask = async (peer, skill, text) => {
  const { page } = peer;
  await openCompanionTab(peer, 'deck.companion.tab.assistant-chat', 'Assistant');
  const prompt = companion(page).getByTestId('assistant.prompt').locator('.cm-content').first();
  await peer.click(prompt);
  // A prompt typed into as the chat opens offers no skills yet, so an empty menu is cleared and typed again.
  const option = page
    .locator('.cm-tooltip-autocomplete li')
    .filter({ hasText: `/${skill}` })
    .first();
  for (let attempt = 0; ; attempt++) {
    await page.waitForTimeout(1_500);
    await peer.type(`/${skill.slice(0, 4)}`, { delay: 80 });
    const shown = await option
      .waitFor({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (shown) {
      break;
    }
    if (attempt === 3) {
      throw new Error(`the prompt's menu offers no /${skill}`);
    }
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
  }
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await peer.type(` ${text}`, { delay: 15 });
  await peer.click(companion(page).getByTestId('assistant.send'));
};

const sidebar = (page) => page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
const notificationsTab = (page) => page.locator('[role="tab"][aria-label="Notifications"]').first();

/** A thread in the companion's Comments, by a message in it. */
const thread = (page, text) => companion(page).getByTestId('thread').filter({ hasText: text }).first();

/** Types into a thread's reply box and sends it. */
const reply = async (peer, scope, text) => {
  await peer.click(scope.getByTestId('thread.reply').last());
  await peer.type(text, { delay: 25 });
  await peer.page.keyboard.press('Enter');
};

/**
 * Comments on the feature `name`'s description: the description is selected and the spec toolbar's Comment action,
 * which a narrow toolbar folds into its overflow, anchors a thread there.
 */
const commentOnFeature = async (peer, name, text) => {
  const { page } = peer;
  const description = editable(featureForm(page, name).getByTestId('_prose').first());
  await description.scrollIntoViewIfNeeded();
  await peer.click(description.locator('.cm-line').first(), { force: true });
  // The whole description, so the thread quotes the sentence it asks about.
  await page.keyboard.press('ControlOrMeta+a');
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
  await peer.type(text, { delay: 25 });
  await page.keyboard.press('Enter');
  await thread(page, text).waitFor({ timeout: TIMEOUT });
};

/** Opens a notification from the sidebar's Notifications; its subject opens with its comments in the companion. */
const openNotification = async (peer, subject) => {
  const { page } = peer;
  // The tab stays selected while the sidebar is collapsed, so only an expanded sidebar counts as open.
  const open =
    (await sidebar(page).getAttribute('data-state')) === 'expanded' &&
    (await notificationsTab(page).getAttribute('aria-selected')) === 'true';
  if (!open) {
    await peer.click(notificationsTab(page));
  }
  const notification = page.getByTestId('messenger.notification').filter({ hasText: subject }).first();
  // The tile's title opens the notification; its attachment chip would open only the object.
  await peer.click(notification.getByText(subject).first());
  await plank(page).getByText(subject).first().waitFor({ timeout: TIMEOUT });
  // The notification opens Comments beside the plank, but the deck draws a companion only when the pair fits, and
  // beside an open sidebar it does not.
  await peer.click(sidebar(page).getByTestId('deck.toggleComplementarySidebar'));
};

/** The spec's scrolling element, the nearest ancestor of its text that scrolls. */
const scrollSpec = (page, top) =>
  specDocument(page).evaluate((element, top) => {
    let scroller = element.querySelector('.cm-content');
    while (
      scroller &&
      !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))
    ) {
      scroller = scroller.parentElement;
    }
    if (!scroller) {
      return { atEnd: true, moved: false };
    }
    const before = scroller.scrollTop;
    if (top === -Infinity) {
      scroller.scrollTop = 0;
    } else if (top) {
      scroller.scrollBy({ top });
    }
    return {
      atEnd: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4,
      moved: scroller.scrollTop !== before,
    };
  }, top);

/** Scrolls the spec from its top until `target` is drawn, then brings it into view; the editor draws only nearby blocks. */
const reveal = async (page, target, what) => {
  await scrollSpec(page, -Infinity);
  for (let screen = 0; screen < 80; screen++) {
    if ((await target.count()) > 0) {
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      return;
    }
    const { atEnd } = await scrollSpec(page, 400);
    await page.waitForTimeout(100);
    if (atEnd && (await target.count()) === 0) {
      break;
    }
  }
  throw new Error(`${what} never came into view`);
};

/** Picks `name` in the depends field of the feature `feature`; the form shows its empty fields once pressed. */
const pickDependency = async (peer, feature, name) => {
  const { page } = peer;
  const form = featureForm(page, feature);
  await peer.click(form.getByTestId('spec-block.label').first());
  await page.waitForTimeout(300);
  const depends = form.getByTestId('depends').first();
  await peer.click(depends.locator('[data-scope="combobox"][data-part="trigger"]').first());
  const option = page
    .locator('[data-scope="combobox"][data-part="item"]')
    .filter({ visible: true })
    .filter({ hasText: name });
  await option.first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await peer.click(option.first());
  await page.keyboard.press('Escape');
};

/** Scrolls the spec's text from the top to its end, a screen at a time. */
const readThrough = async (peer) => {
  const { page } = peer;
  await scrollSpec(page, -Infinity);
  const box = await specDocument(page).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height, 600) / 2);
  for (let screen = 0; screen < 40; screen++) {
    if ((await scrollSpec(page, 0)).atEnd) {
      return;
    }
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(700);
  }
};

export const steps = [
  {
    name: 'Both peers boot with their own identity and name, with plugin-code on',
    setup: true,
    run: async ({ peers }) => {
      // The notice arrives a moment after boot.
      await peers.alice.page.waitForTimeout(3_000);
      for (const peer of [peers.alice, peers.bob]) {
        await clearChrome(peer);
        // Names the carets, the viewers and the comments.
        await peer.page.evaluate(
          (displayName) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName }),
          peer.name,
        );
        await enableCode(peer);
        await clearChrome(peer);
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
    name: 'Alice creates the project "Chess", adds the spec "Chess plugin" on its Specs tab and checks Software in Extensions.',
    subtitle: 'QA-12 step 1',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(currentWorkspace(page).getByTestId('spacePlugin.createObject').first());
      await alice.click(page.getByTestId('create-object-form.type.org.dxos.type.project'));
      await alice.click(page.getByTestId('create-project-panel.name-input'));
      await alice.type(PROJECT);
      await alice.click(dialog(page).getByTestId('save-button'));
      await page.getByTestId('create-project-panel.name-input').waitFor({ state: 'detached', timeout: TIMEOUT });
      await notes(page).waitFor({ timeout: TIMEOUT });
      projectUrl = page.url();
      // A new project opens its Help companion.
      await closeCompanion(alice);

      await alice.click(plank(page).getByTestId('projectsPlugin.tab.spec'));
      await alice.click(plank(page).getByTestId('projectsPlugin.addSpec').first());
      await alice.click(dialog(page).getByPlaceholder('Name'));
      await alice.type(SPEC);
      await alice.click(dialog(page).getByTestId('save-button'));
      await dialog(page).waitFor({ state: 'detached', timeout: TIMEOUT });
      await closeCompanion(alice);
      const extensions = specToolbar(page).getByTestId('projectsPlugin.specExtensions');
      // The toolbar draws after the new spec opens, with Extensions in it or folded into its overflow.
      await extensions.or(specToolbar(page).getByTestId('toolbar.overflow')).first().waitFor({ timeout: TIMEOUT });
      if (await extensions.isVisible()) {
        await alice.click(extensions);
      } else {
        await alice.click(specToolbar(page).getByTestId('toolbar.overflow'));
        await alice.click(page.locator('[role="menu"] [data-testid="projectsPlugin.specExtensions"]'));
      }
      await alice.click(page.locator('[role="menu"] >> [role="menuitemcheckbox"]:has-text("Software")'));
      for (let attempt = 0; attempt < 3 && (await page.locator('[role="menu"]').count()) > 0; attempt++) {
        await page.keyboard.press('Escape');
      }
      await specText(page).waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Alice types a line saying what the plugin is and two bullets under it.',
    subtitle: 'QA-12 step 2',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(specText(page));
      // The editor continues a list on Enter, so only the first bullet types its marker.
      await alice.type(`${SUMMARY}\n\n- ${BOARD}\n${MOVE}`, { delay: 25 });
      for (const text of [SUMMARY, BOARD, MOVE]) {
        await specLine(page, text).waitFor({ timeout: TIMEOUT });
      }
    },
  },
  {
    name: 'Bob opens "Chess" from Projects in the navigation tree, then its Specs tab.',
    subtitle: 'QA-12 step 3',
    run: async ({ peers: { alice, bob } }) => {
      await openProject(bob);
      await closeCompanion(bob);
      await bob.click(plank(bob.page).getByTestId('projectsPlugin.tab.spec'));
      await specLine(bob.page, MOVE).waitFor({ timeout: TIMEOUT });
      for (const { page } of [alice, bob]) {
        await plank(page).getByTestId('spacePlugin.presence.member').first().waitFor({ timeout: TIMEOUT });
      }
      await expectCaret(specDocument(bob.page), 'Alice', "Bob's spec");
      await hold(alice);
    },
  },
  {
    name: 'Alice adds a bullet while Bob adds two of his own at the end.',
    subtitle: 'QA-12 step 4',
    run: async ({ peers: { alice, bob } }) => {
      await Promise.all([
        (async () => {
          await alice.click(specLine(alice.page, BOARD));
          await alice.page.keyboard.press('End');
          await alice.type(`\n${LOBBY}`);
        })(),
        (async () => {
          await bob.click(specLine(bob.page, MOVE));
          await bob.page.keyboard.press('ControlOrMeta+End');
          await bob.type(`\n${RULES}\n${SYNC}`);
        })(),
      ]);
      for (const { page } of [alice, bob]) {
        for (const text of [BOARD, LOBBY, MOVE, RULES, SYNC]) {
          await specLine(page, text).waitFor({ timeout: TIMEOUT });
        }
      }
      await expectCaret(specDocument(alice.page), 'Bob', "Alice's spec");
      await expectCaret(specDocument(bob.page), 'Alice', "Bob's spec");
      await hold(alice);
    },
  },
  {
    name: "Bob opens Board. Alice types `Gameboard /feat` over her first bullet, Bob `Start Game /feat` over the lobby bullet and Alice `Make Move /feat` over the move bullet; each describes the feature with the bullet's words.",
    subtitle: 'QA-12 step 5',
    run: async ({ peers: { alice, bob } }) => {
      await openBoard(bob);
      // One at a time: a block landing from the other peer closes an open `/feat` menu.
      await makeFeature(alice, BOARD, 'Gameboard');
      await boardCard(bob.page, 'Gameboard').waitFor({ timeout: TIMEOUT });
      await makeFeature(bob, LOBBY, 'Start Game');
      await boardCard(bob.page, 'Start Game').waitFor({ timeout: TIMEOUT });
      await makeFeature(alice, MOVE, 'Make Move');
      await boardCard(bob.page, 'Make Move').waitFor({ timeout: TIMEOUT });
      for (const { page } of [alice, bob]) {
        for (const name of ['Gameboard', 'Start Game', 'Make Move']) {
          await featureForm(page, name).waitFor({ timeout: TIMEOUT });
        }
      }
      await hold(alice);
    },
  },
  {
    name: `Bob comments on "Make Move"'s description, "${MOVE_QUESTION}", then closes his tab.`,
    subtitle: 'QA-12 step 6',
    run: async ({ peers: { bob } }) => {
      await openComments(bob);
      await commentOnFeature(bob, 'Make Move', MOVE_QUESTION);
      await hold(bob);
      await bob.page.goto('about:blank');
    },
  },
  {
    name: "Alice opens the Assistant in the companion and asks it to turn the draft into the spec for a Composer chess plugin, with requirements for every feature and the plugin's types and operations as `type` and `op` blocks.",
    subtitle: 'QA-12 step 7',
    run: async ({ peers: { alice }, speed }) => {
      await ask(alice, 'feature-map', ASK);
      await waitFor(() => agentBusy(alice.page), { timeout: 30_000, what: 'the agent to start' });
      await speed(AGENT_SPEED);
      let idle = 0;
      await waitFor(
        async () => {
          idle = (await agentBusy(alice.page)) ? 0 : idle + 1;
          // Ten seconds without a status: between tool calls a turn shows its totals for a moment.
          return idle >= 40;
        },
        { timeout: 20 * 60_000, what: 'the agent to finish' },
      );
      await speed(1);
      // Read from the text itself, since the editor draws only the blocks in view.
      const blocks = blocksOf(await specContent(alice.page));
      const features = blocks.filter(({ kind }) => kind === 'feat');
      const names = features.map(({ title }) => title);
      const bare = features.filter(({ requirements }) => requirements === 0).map(({ title }) => title);
      const types = blocks.filter(({ kind }) => kind === 'type').length;
      const ops = blocks.filter(({ kind }) => kind === 'op').length;
      if (features.length < FEATURE_COUNT || !FEATURES.every((name) => names.includes(name)) || bare.length > 0) {
        throw new Error(`the agent left ${names.join(', ')}; without requirements: ${bare.join(', ') || 'none'}`);
      }
      if (types === 0 || ops === 0) {
        throw new Error(`the spec's text has ${types} type and ${ops} op blocks`);
      }
      await hold(alice);
    },
  },
  {
    name: `Alice answers Bob's question on "Make Move", "${MOVE_ANSWER}"`,
    subtitle: 'QA-12 step 8',
    run: async ({ peers: { alice } }) => {
      await openComments(alice);
      await thread(alice.page, MOVE_QUESTION).waitFor({ timeout: TIMEOUT });
      await reply(alice, thread(alice.page, MOVE_QUESTION), MOVE_ANSWER);
      await thread(alice.page, MOVE_ANSWER).waitFor({ timeout: TIMEOUT });
      await hold(alice);
    },
  },
  {
    name: 'Bob opens Composer again.',
    subtitle: 'QA-12 step 9',
    run: async ({ peers: { bob }, speed }) => {
      await speed(4);
      await bob.page.goto(projectUrl);
      await plank(bob.page).waitFor({ timeout: 120_000 });
      await speed(1);
      await clearChrome(bob);
      await bob.page.locator('[role="tab"][aria-label="Notifications"][data-badge="1"]').waitFor({ timeout: TIMEOUT });
      await bob.click(notificationsTab(bob.page));
      await bob.page.getByTestId('messenger.notification').filter({ hasText: SPEC }).first().waitFor();
      await hold(bob);
    },
  },
  {
    name: `Bob opens the "${SPEC}" notification and replies "@${AGENT} ${MOVE_ASK}".`,
    subtitle: 'QA-12 step 10',
    run: async ({ peers: { bob }, speed }) => {
      // Bob's replica may still be catching up after his return; the agent gave every feature requirements.
      await waitFor(async () => (await requirementsOf(bob.page, 'Make Move')) > 0, {
        timeout: TIMEOUT,
        what: "Make Move's requirements on Bob's side",
      });
      const before = await requirementsOf(bob.page, 'Make Move');
      await openNotification(bob, SPEC);
      const scope = thread(bob.page, MOVE_ANSWER);
      await scope.waitFor({ timeout: TIMEOUT });
      await bob.click(scope.getByTestId('thread.reply').last());
      await bob.type(`@${AGENT.slice(0, 2)}`, { delay: 80 });
      await bob.page
        .locator('.cm-tooltip-autocomplete li')
        .filter({ hasText: `@${AGENT}` })
        .first()
        .waitFor();
      await bob.page.waitForTimeout(400);
      await bob.page.keyboard.press('Enter');
      // The mention completes with its own trailing space.
      await bob.type(MOVE_ASK, { delay: 25 });
      await bob.page.keyboard.press('Enter');
      await speed(AGENT_SPEED);
      await waitFor(async () => (await requirementsOf(bob.page, 'Make Move')) > before, {
        timeout: 5 * 60_000,
        what: 'Make Move to gain a requirement',
      });
      // Kai's "Working on it…" stands in the thread until its reply takes its place.
      const last = scope.getByTestId('thread.message').last();
      await waitFor(
        async () => {
          // The sender's name is a line of its own; Bob's "@Kai" is not.
          const text = await last.innerText();
          return text.split('\n').some((line) => line.trim() === AGENT) && !text.includes('Working on it');
        },
        { timeout: 2 * 60_000, what: "Kai's reply in the thread" },
      );
      await speed(1);
      await hold(bob);
    },
  },
  {
    name: 'Bob resolves the thread.',
    subtitle: 'QA-12 step 11',
    run: async ({ peers: { alice, bob } }) => {
      const scope = thread(bob.page, MOVE_QUESTION);
      await scope.hover();
      await bob.click(scope.getByTestId('thread.resolve'));
      for (const peer of [alice, bob]) {
        await waitFor(async () => (await thread(peer.page, MOVE_QUESTION).count()) === 0, {
          what: `the thread to leave ${peer.name}'s active comments`,
        });
      }
      await hold(bob);
    },
  },
  {
    name: 'Alice opens Board. Bob opens "Chess" again and, in "Make Move"\'s form, picks "Gameboard" and "Move Validation" as features it depends on. Alice selects "Make Move" on her Board.',
    subtitle: 'QA-12 step 12',
    run: async ({ peers: { alice, bob } }) => {
      await openBoard(alice);
      await openProject(bob);
      await closeCompanion(bob);
      await bob.click(plank(bob.page).getByTestId('projectsPlugin.tab.spec'));
      await reveal(bob.page, featureForm(bob.page, 'Make Move'), "Make Move's form");
      for (const name of DEPENDENCIES) {
        await pickDependency(bob, 'Make Move', name);
        await bob.page.waitForTimeout(800);
      }
      await alice.click(boardCard(alice.page, 'Make Move'));
      for (const name of DEPENDENCIES) {
        await waitFor(async () => (await boardCard(alice.page, name).getAttribute('data-relation')) === 'dependency', {
          timeout: 30_000,
          what: `${name} to show as a dependency on Alice's Board`,
        });
      }
      await hold(alice);
    },
  },
  {
    name: "Both scroll through the spec's text from the top.",
    subtitle: 'QA-12 step 13',
    run: async ({ peers: { alice, bob } }) => {
      for (const peer of [alice, bob]) {
        await closeCompanion(peer);
        await specText(peer.page).waitFor({ timeout: TIMEOUT });
      }
      await Promise.all([readThrough(alice), readThrough(bob)]);
      await hold(alice);
    },
  },
];

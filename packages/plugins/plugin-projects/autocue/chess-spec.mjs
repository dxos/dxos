//
// Copyright 2026 DXOS.org
//

/**
 * Alice and Bob write the spec for a Composer chess plugin together: a draft typed at the same time, features made in
 * the text and on the feature map at once, an agent that fills in requirements, types and operations, dependencies
 * drawn on the map, and two comments that wait for Alice while she is offline.
 *
 * @title Write a chess plugin's spec together
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-11
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
 * The agent runs on a live model, so its step takes minutes and plays fast-forwarded. Feature sections come from
 * plugin-code's Software package, a Labs plugin outside dev builds, so setup turns it on for both peers. Keep the
 * file free of imports, since it is loaded from outside the workspace.
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
const LOBBY = 'Players find and join open games in a lobby.';
const RULES = 'Every move is checked against the rules.';
const SYNC = 'Games are saved and reach every peer.';
const ASK =
  "Turn this draft into the full spec for a Composer chess plugin: a feature for each remaining bullet, requirements for every feature, and the plugin's types (down to pieces and squares) and operations as type and op blocks.";
/** The features the draft names, and the agent's for the remaining bullets, whatever it calls them. */
const FEATURES = ['Gameboard', 'Make Move', 'Start Game'];
const FEATURE_COUNT = 6;
// The agent runs on a live model for minutes; its stretch plays this many times faster in the cut.
const AGENT_SPEED = 10;

const BOARD_QUESTION = 'What does the board show when the game is over?';
const MOVE_QUESTION = 'Who checks a move, the board or the engine?';
const BOARD_ANSWER = 'Nothing yet: no requirement covers a finished game.';
const MOVE_ANSWER = 'Move Validation does; Make Move needs it, as the map shows.';
const MOVE_REPLY = 'Thanks, that settles it.';
// The comment agent's name, as a thread's `@` menu offers it.
const AGENT = 'Kai';
const BOARD_ASK = 'add a requirement that a finished game shows its result and takes no more moves';

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
/** The spec's own text; each feature section inside it has a `.cm-content` of its own. */
const specText = (page) => specDocument(page).locator('.cm-content').first();
const specLine = (page, text) => specDocument(page).locator('.cm-line', { hasText: text }).first();
const specView = (page, view) => plank(page).getByTestId(`projectsPlugin.specView.${view}`);
const canvas = (page) => page.getByTestId('feature-map.canvas').first();
const card = (page, name) => page.getByTestId('feature-canvas-node').filter({ hasText: name }).first();
const companion = (page) => page.getByTestId('deck.companion').filter({ visible: true }).first();
const editable = (field) => field.locator('[contenteditable="true"]');
/** The section of the embedded feature whose description is `text`: the innermost element holding both fields. */
const featureSection = (page, text) =>
  specDocument(page)
    .locator('div')
    .filter({ has: page.getByTestId('description').filter({ hasText: text }) })
    .filter({ has: page.getByTestId('name') })
    .last();

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

/** The names of the features the spec's text embeds, as their sections show them. */
const embeddedFeatures = (page) =>
  specDocument(page)
    .getByTestId('name')
    .evaluateAll((fields) => fields.map((field) => field.textContent?.trim() ?? ''));

const expectFeatures = (page, names, what) =>
  waitFor(
    async () => {
      const shown = await embeddedFeatures(page);
      return names.every((name) => shown.includes(name));
    },
    { what: `${names.join(', ')} in ${what}` },
  );

/** The project's address, taken when Alice creates it; the navtree lists projects only once indexed. */
let projectUrl;

/**
 * Opens the project by its address inside the running app. A reload would restart a peer that just joined from an
 * empty replica, so the route changes in place and the wait covers the project arriving. `ready` is what shows once it
 * has, since the plank reopens on the tab it was left on.
 */
const openProject = async ({ page }, ready = notes) => {
  const { pathname, search } = new URL(projectUrl);
  await page.evaluate((path) => {
    globalThis.history.pushState({}, '', path);
    globalThis.dispatchEvent(new PopStateEvent('popstate'));
  }, `${pathname}${search}`);
  await ready(page).waitFor({ timeout: 120_000 });
};

/** Closes the companion, which narrows the plank until the spec toolbar overflows and the canvas zooms out. */
const closeCompanion = async (peer) => {
  const close = peer.page.getByTestId('plankHeading.closeCompanion').filter({ visible: true });
  if ((await close.count()) > 0) {
    await peer.click(close.first());
  }
};

/** A tooltip left open by the last hover covers the view toggle, so the pointer rests off the plank first. */
const showView = async (peer, view) => {
  await peer.page.mouse.move(600, 880);
  await peer.page.waitForTimeout(500);
  await peer.click(specView(peer.page, view));
};

/**
 * Turns the line holding `text` into a feature named `name`: the line's sentence becomes its description and the
 * cursor moves to the new feature's name. The first feature's section can mount twice and drop that focus, so a
 * name that did not take is typed again into the section holding the sentence.
 */
const makeFeature = async (peer, text, name) => {
  const { page } = peer;
  await peer.click(specLine(page, text));
  await page.keyboard.press('End');
  await peer.type(' /feature');
  // Enter before an option is selected, or in the menu's first moments, inserts a newline instead of the feature.
  const option = page.locator('.cm-tooltip-autocomplete [aria-selected="true"]');
  await option.waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await option.waitFor({ timeout: 1_000 });
  await page.keyboard.press('Enter');
  const section = featureSection(page, text);
  await section.waitFor({ timeout: TIMEOUT });
  await page.waitForTimeout(500);
  await peer.type(name);
  await page.waitForTimeout(500);
  if ((await embeddedFeatures(page)).includes(name)) {
    return;
  }
  await peer.click(editable(section.getByTestId('name')), { force: true });
  await page.keyboard.press('ControlOrMeta+a');
  await peer.type(name);
  await waitFor(async () => (await embeddedFeatures(page)).includes(name), { what: `the feature "${name}"` });
};

/**
 * Hovers the empty canvas cell below `beside`, takes its `+` and adds a new feature, which opens in the companion. The
 * cell to the right is where the next feature made in the text goes.
 */
const addFeatureOnCanvas = async (peer, beside) => {
  const { page } = peer;
  const box = await card(page, beside).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 320, { steps: 8 });
  await peer.click(page.getByTestId('feature-canvas.add'));
  await peer.click(page.getByRole('menuitem', { name: 'Add new feature' }));
  await editable(companion(page).getByTestId('name').first()).waitFor({ timeout: TIMEOUT });
};

/** Names the feature open in the companion, then closes it. */
const nameInCompanion = async (peer, name) => {
  const { page } = peer;
  await peer.click(editable(companion(page).getByTestId('name').first()));
  await page.keyboard.press('ControlOrMeta+a');
  await peer.type(name);
  await closeCompanion(peer);
  // Off the plank heading, whose tooltip would otherwise stay over the canvas.
  await page.mouse.move(600, 880);
  await card(page, name).waitFor({ timeout: TIMEOUT });
};

/** What the space holds for the spec: each feature's name and requirement count, and the spec text's mdl blocks. */
const specState = (page) =>
  page.evaluate(async () => {
    const { dxos } = globalThis;
    const features = [];
    let text = '';
    for (const space of dxos.spaces()) {
      for (const feature of await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.feature'))).run()) {
        // Requirements are a record keyed for comment anchors; `requirementOrder` only orders them.
        features.push({ name: feature.name, requirements: Object.keys(feature.requirements ?? {}).length });
      }
      for (const spec of await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.projects.spec'))).run()) {
        text += (await spec.content?.load?.())?.content ?? '';
      }
    }
    return {
      features,
      embeds: (text.match(/\]\(echo:\/\//g) ?? []).length,
      types: (text.match(/^type \w/gm) ?? []).length,
      ops: (text.match(/^op \w/gm) ?? []).length,
    };
  });

/** The chat is working while its last turn shows a status rather than its totals. */
const agentBusy = async (page) =>
  /Preparing|Contacting|Thinking|Generating|Calling tool|Running/.test((await companion(page).innerText()).slice(-400));

/** Opens the Assistant in the companion and sends `text` with the skill picked first from the prompt's `/` menu. */
const ask = async (peer, skill, text) => {
  const { page } = peer;
  await peer.click(plank(page).getByTestId('plankHeading.companion').first());
  await peer.click(companion(page).getByTestId('deck.companion.tab.assistant-chat').first());
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

/**
 * Draws a dependency on the canvas from the port on the right of `from`'s card onto the middle of `to`'s. A card shows
 * its ports under the pointer only while nothing is selected, and a new arrow re-places the cards nobody placed, so
 * each arrow starts from a cleared selection and a fitted map. The drag moves in steps, since the canvas starts a link
 * only once the pointer has moved.
 */
const drawDependency = async (peer, from, to) => {
  const { page } = peer;
  await page.mouse.move(600, 880);
  await peer.click(page.getByTestId('toolbar-fit'));
  await page.waitForTimeout(500);
  const source = await card(page, from).boundingBox();
  const target = await card(page, to).boundingBox();
  // A press on the background clears the selection; the gutter above the card is background, not an empty cell.
  await page.mouse.click(source.x + source.width / 2, source.y - 8);
  await page.waitForTimeout(300);
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2, { steps: 6 });
  await page.waitForTimeout(300);
  await page.mouse.move(source.x + source.width, source.y + source.height / 2, { steps: 4 });
  await page.waitForTimeout(400);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 25 });
  await page.waitForTimeout(300);
  await page.mouse.up();
};

/** The space's dependencies, as `feature → dependency` by name. */
const dependencies = (page) =>
  page.evaluate(async () => {
    const { dxos } = globalThis;
    const edges = [];
    for (const space of dxos.spaces()) {
      for (const edge of await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.relation.dependsOn'))).run()) {
        edges.push(`${dxos.Relation.getSource(edge)?.name} → ${dxos.Relation.getTarget(edge)?.name}`);
      }
    }
    return edges;
  });

const sidebar = (page) => page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
const notificationsTab = (page) => page.locator('[role="tab"][aria-label="Notifications"]').first();

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

/** Types into a thread's reply box and sends it. */
const reply = async (peer, scope, text) => {
  await peer.click(scope.getByTestId('thread.reply').last());
  await peer.type(text, { delay: 25 });
  await peer.page.keyboard.press('Enter');
};

/**
 * Comments on a feature's description in the spec's text: its section takes attention, the description is selected,
 * and the Comments companion's add button anchors a thread there, which also follows the feature for its author.
 */
const commentOnFeature = async (peer, name, text) => {
  const { page } = peer;
  const section = specDocument(page)
    .getByTestId('markdown.embed')
    .filter({ has: page.getByTestId('name').filter({ hasText: name }) })
    .first();
  await section.scrollIntoViewIfNeeded();
  await peer.click(section, { position: { x: 12, y: 12 } });
  await peer.click(editable(section.getByTestId('description')).first(), { force: true });
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+ControlOrMeta+ArrowLeft');
  await peer.click(companion(page).getByTestId('comments.object-comment.add'));
  await reply(peer, companion(page), text);
  await thread(page, text).waitFor({ timeout: TIMEOUT });
};

/** Opens a notification's subject from the sidebar's Notifications, then the subject's comments in its companion. */
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
  await peer.click(notification.getByText(subject).last());
  await plank(page).getByText(subject).first().waitFor({ timeout: TIMEOUT });
  await peer.click(sidebar(page).getByTestId('deck.toggleComplementarySidebar'));
  await openComments(peer);
};

/** The requirements of the feature named `name`, as the space holds them. */
const requirementsOf = (page, name) =>
  page.evaluate(async (name) => {
    const { dxos } = globalThis;
    for (const space of dxos.spaces()) {
      for (const feature of await space.db.query(dxos.Filter.type(dxos.DXN.make('org.dxos.type.feature'))).run()) {
        if (feature.name === name) {
          return Object.values(feature.requirements ?? {}).map(({ text }) => text);
        }
      }
    }
    return [];
  }, name);

/** Scrolls the spec's text from the top to its end, a screen at a time. */
const readThrough = async (peer) => {
  const { page } = peer;
  const box = await specDocument(page).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height, 600) / 2);
  for (let screen = 0; screen < 40; screen++) {
    const atEnd = await specDocument(page).evaluate((element) => {
      let scroller = element;
      while (
        scroller &&
        !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))
      ) {
        scroller = scroller.parentElement;
      }
      return !scroller || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
    });
    if (atEnd) {
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
    subtitle: 'QA-11 step 1',
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
      await alice.click(plank(page).getByTestId('projectsPlugin.specExtensions'));
      await alice.click(page.locator('[role="menu"] >> [role="menuitemcheckbox"]:has-text("Software")'));
      await page.keyboard.press('Escape');

      for (const view of ['document', 'canvas', 'kanban']) {
        await specView(page, view).waitFor({ timeout: TIMEOUT });
      }
      await specText(page).waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Alice types a line saying what the plugin is and two bullets under it.',
    subtitle: 'QA-11 step 2',
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
    name: 'Bob opens "Chess" on its Specs tab.',
    subtitle: 'QA-11 step 3',
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
    subtitle: 'QA-11 step 4',
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
    name: 'Bob switches to Canvas. Alice turns her first two bullets into features with `/feature`, naming them "Gameboard" and "Make Move", while Bob adds "Start Game" from the `+` in an empty cell.',
    subtitle: 'QA-11 step 5',
    run: async ({ peers: { alice, bob } }) => {
      await showView(bob, 'canvas');
      await canvas(bob.page).waitFor({ timeout: TIMEOUT });
      await makeFeature(alice, BOARD, 'Gameboard');
      await card(bob.page, 'Gameboard').waitFor({ timeout: TIMEOUT });
      // Bob's new feature lands in Alice's text too, which would close her `/feature` menu if it arrived mid-gesture.
      await addFeatureOnCanvas(bob, 'Gameboard');
      await Promise.all([makeFeature(alice, MOVE, 'Make Move'), nameInCompanion(bob, 'Start Game')]);
      for (const name of ['Gameboard', 'Make Move', 'Start Game']) {
        await card(bob.page, name).waitFor({ timeout: TIMEOUT });
      }
      await expectFeatures(alice.page, ['Gameboard', 'Make Move', 'Start Game'], "Alice's spec");
      await hold(alice);
    },
  },
  {
    name: "Alice opens the Assistant in the companion and asks it to turn the draft into a full spec for a Composer chess plugin, with requirements for every feature and the plugin's types and operations as `type` and `op` blocks.",
    subtitle: 'QA-11 step 6',
    run: async ({ peers: { alice, bob }, speed }) => {
      await ask(alice, 'feature-map', ASK);
      await waitFor(() => agentBusy(alice.page), { timeout: 30_000, what: 'the agent to start' });
      await speed(AGENT_SPEED);
      let idle = 0;
      await waitFor(
        async () => {
          idle = (await agentBusy(alice.page)) ? 0 : idle + 1;
          return idle >= 3;
        },
        { timeout: 20 * 60_000, what: 'the agent to finish' },
      );
      await speed(1);
      const { features, embeds, types, ops } = await specState(alice.page);
      const names = features.map(({ name }) => name);
      const bare = features.filter(({ requirements }) => requirements === 0).map(({ name }) => name);
      if (features.length < FEATURE_COUNT || !FEATURES.every((name) => names.includes(name)) || bare.length > 0) {
        throw new Error(`the agent left ${names.join(', ')}; without requirements: ${bare.join(', ') || 'none'}`);
      }
      // Read from the text itself, since the editor draws only the sections in view.
      if (embeds < features.length || types === 0 || ops === 0) {
        throw new Error(`the spec's text has ${embeds} features, ${types} type and ${ops} op blocks`);
      }
      await bob.click(bob.page.getByTestId('toolbar-fit'));
      for (const name of names) {
        await card(bob.page, name).waitFor({ timeout: TIMEOUT });
      }
      await hold(alice);
    },
  },
  {
    name: 'On the canvas, Bob draws an arrow from "Make Move" to "Gameboard", then one from "Make Move" to "Move Validation".',
    subtitle: 'QA-11 step 7',
    run: async ({ peers: { alice, bob } }) => {
      await closeCompanion(alice);
      for (const to of ['Gameboard', 'Move Validation']) {
        await drawDependency(bob, 'Make Move', to);
        await waitFor(async () => (await dependencies(alice.page)).includes(`Make Move → ${to}`), {
          timeout: 30_000,
          what: `Make Move to need ${to} at Alice's end`,
        });
      }
      await bob.click(bob.page.getByTestId('toolbar-fit'));
      await hold(alice);
    },
  },
  {
    name: 'Alice comments on "Gameboard"\'s description, "What does the board show when the game is over?", and on "Make Move"\'s, "Who checks a move, the board or the engine?", then closes her tab.',
    subtitle: 'QA-11 step 8',
    run: async ({ peers: { alice } }) => {
      await showView(alice, 'document');
      await openComments(alice);
      await commentOnFeature(alice, 'Gameboard', BOARD_QUESTION);
      await commentOnFeature(alice, 'Make Move', MOVE_QUESTION);
      await hold(alice);
      await alice.page.goto('about:blank');
    },
  },
  {
    name: `Bob answers both: "${BOARD_ANSWER}" on Gameboard and "${MOVE_ANSWER}" on Make Move.`,
    subtitle: 'QA-11 step 9',
    run: async ({ peers: { bob } }) => {
      await showView(bob, 'document');
      await openComments(bob);
      for (const [question, answer] of [
        [BOARD_QUESTION, BOARD_ANSWER],
        [MOVE_QUESTION, MOVE_ANSWER],
      ]) {
        await thread(bob.page, question).waitFor({ timeout: TIMEOUT });
        await reply(bob, thread(bob.page, question), answer);
        await thread(bob.page, answer).waitFor({ timeout: TIMEOUT });
      }
      await hold(bob);
    },
  },
  {
    name: 'Alice opens Composer again.',
    subtitle: 'QA-11 step 10',
    run: async ({ peers: { alice }, speed }) => {
      await speed(4);
      await alice.page.goto(projectUrl);
      await plank(alice.page).waitFor({ timeout: 120_000 });
      await speed(1);
      await clearChrome(alice);
      await alice.page
        .locator('[role="tab"][aria-label="Notifications"][data-badge="2"]')
        .waitFor({ timeout: TIMEOUT });
      await alice.click(notificationsTab(alice.page));
      for (const subject of ['Gameboard', 'Make Move']) {
        await alice.page.getByTestId('messenger.notification').filter({ hasText: subject }).first().waitFor();
      }
      await hold(alice);
    },
  },
  {
    name: `Alice opens the "Make Move" notification and replies "${MOVE_REPLY}"`,
    subtitle: 'QA-11 step 11',
    run: async ({ peers: { alice, bob } }) => {
      await openNotification(alice, 'Make Move');
      await reply(alice, thread(alice.page, MOVE_ANSWER), MOVE_REPLY);
      await thread(bob.page, MOVE_REPLY).waitFor({ timeout: TIMEOUT });
      await hold(alice);
    },
  },
  {
    name: `Alice opens the "Gameboard" notification and replies "@${AGENT} ${BOARD_ASK}".`,
    subtitle: 'QA-11 step 12',
    run: async ({ peers: { alice }, speed }) => {
      const before = await requirementsOf(alice.page, 'Gameboard');
      await openNotification(alice, 'Gameboard');
      const scope = thread(alice.page, BOARD_ANSWER);
      await alice.click(scope.getByTestId('thread.reply').last());
      await alice.type(`@${AGENT.slice(0, 2)}`, { delay: 80 });
      await alice.page
        .locator('.cm-tooltip-autocomplete li')
        .filter({ hasText: `@${AGENT}` })
        .first()
        .waitFor();
      await alice.page.waitForTimeout(400);
      await alice.page.keyboard.press('Enter');
      // The mention completes with its own trailing space.
      await alice.type(BOARD_ASK, { delay: 25 });
      await alice.page.keyboard.press('Enter');
      await speed(AGENT_SPEED);
      await waitFor(async () => (await requirementsOf(alice.page, 'Gameboard')).length > before.length, {
        timeout: 5 * 60_000,
        what: 'Gameboard to gain a requirement',
      });
      await speed(1);
      await hold(alice);
    },
  },
  {
    name: 'Alice resolves the "Gameboard" thread.',
    subtitle: 'QA-11 step 13',
    run: async ({ peers: { alice, bob } }) => {
      const scope = thread(alice.page, BOARD_QUESTION);
      await scope.hover();
      await alice.click(scope.getByTestId('thread.resolve'));
      for (const peer of [alice, bob]) {
        await waitFor(async () => (await thread(peer.page, BOARD_QUESTION).count()) === 0, {
          what: `the Gameboard thread to leave ${peer.name}'s active comments`,
        });
      }
      await hold(alice);
    },
  },
  {
    name: "Both scroll through the spec's text from the top.",
    subtitle: 'QA-11 step 14',
    run: async ({ peers: { alice, bob } }) => {
      await openProject(alice, (page) => plank(page).getByTestId('projectsPlugin.tab.spec'));
      await alice.click(plank(alice.page).getByTestId('projectsPlugin.tab.spec'));
      for (const peer of [alice, bob]) {
        await closeCompanion(peer);
        await specLine(peer.page, SUMMARY).waitFor({ timeout: TIMEOUT });
      }
      await Promise.all([readThrough(alice), readThrough(bob)]);
      await hold(alice);
    },
  },
];

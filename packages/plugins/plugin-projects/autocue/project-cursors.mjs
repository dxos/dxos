//
// Copyright 2026 DXOS.org
//

/**
 * Alice and Bob share a project and see each other's named carets in every editor it has: the project's name and
 * description, the overview's Notes, the agent's instructions, the spec's prose, and a feature's name, description
 * and requirement inside the spec.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-10
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE signaling)
 *
 * A flow for `pair.mjs`, not `driver.mjs`: every step receives both peers. Built and served from
 * `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-projects/autocue/project-cursors.mjs --out /tmp/pair --width 1280
 *
 * The space, the project, its spec and the invitation are set up off camera. Feature sections come from
 * plugin-code's Software package, which is a Labs plugin outside dev builds, so setup turns it on for both peers.
 * Keep the file free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Launch';
const PROJECT = 'Launch plan';
const SPEC = 'Launch spec';
const PROSE = 'Ship the launch site and a press kit before the announcement.';
const FEATURE = 'Landing page';
const FEATURE_DESCRIPTION = 'One page that says what Composer is and links the press kit.';
const REQUIREMENT = 'Links the press kit';
const TIMEOUT = 60_000;
// How long a caret stays on screen once it shows, so a viewer can find it.
const HOLD = 2_500;

const NOTES = 'Draft the press kit';
const INSTRUCTIONS = '\nKeep the launch copy short and concrete.';
const PROSE_ADDITION = ' Bob owns the press kit.';
const DESCRIPTION_ADDITION = ' It loads in under a second.';
const PROJECT_DESCRIPTION = 'Everything we ship for the launch.';
const REQUIREMENT_ADDITION = ' from the header';

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
const plank = (page) => page.getByTestId('deck.plank').first();
const dialog = (page) => page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');

const notes = (page) => plank(page).getByTestId('projectsPlugin.outline');
const agent = (page) => plank(page).getByTestId('projectsPlugin.config.agent');
const instructions = (page) => agent(page).locator('.cm-content').first();
const specDocument = (page) => plank(page).getByTestId('projectsPlugin.spec.document');
const specLine = (page, text) => specDocument(page).locator('.cm-line', { hasText: text }).first();
/** A field of the overview's header form, by the JSON path its editor's frame carries as the test id. */
const projectField = (page, path) => plank(page).getByTestId(path).first();
/** A field of the feature section in the spec, by the test id its editor's frame carries. */
const featureField = (page, testId) => specDocument(page).getByTestId(testId).first();
const editable = (field) => field.locator('[contenteditable="true"]');
const featureDescription = (page) => editable(featureField(page, 'description'));
const focusedIn = (locator) => locator.evaluate((element) => element.contains(document.activeElement));

/** A caret drawn for another peer in `scope`, labelled with that peer's name. */
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

/** The project's address, taken when Alice creates it; the navtree lists projects only once indexed. */
let projectUrl;

/**
 * Opens the project by its address inside the running app. A reload would restart a peer that just joined from an
 * empty replica, so the route changes in place and the wait covers the project arriving.
 */
const openProject = async ({ page }) => {
  const { pathname, search } = new URL(projectUrl);
  await page.evaluate((path) => {
    globalThis.history.pushState({}, '', path);
    globalThis.dispatchEvent(new PopStateEvent('popstate'));
  }, `${pathname}${search}`);
  await notes(page).waitFor({ timeout: 120_000 });
};

/**
 * Shows the Specs tab with its document and toolbar drawn. With two browsers booting at once the document can draw
 * and then go blank, so a blank tab is remounted by switching away and back.
 */
const showSpec = async (page) => {
  const tab = (name) => plank(page).getByTestId(`projectsPlugin.tab.${name}`);
  const extensions = plank(page).getByTestId('projectsPlugin.specExtensions');
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      await tab('overview').click();
      await notes(page).waitFor({ timeout: TIMEOUT });
    }
    await tab('spec').click();
    const shown = await extensions
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (shown) {
      return;
    }
  }
  const plugins = await page.evaluate(() =>
    globalThis.composer
      .plugins()
      .filter((plugin) => /code|projects|markdown/.test(plugin.id))
      .map((plugin) => `${plugin.id}=${plugin.enabled}`)
      .join(' '),
  );
  throw new Error(`the Specs tab stayed blank (${plugins})`);
};

const openAgent = async (peer) => {
  const disclosure = agent(peer.page).getByTestId('projectsPlugin.config.agent.disclosure');
  if ((await disclosure.getAttribute('aria-expanded')) !== 'true') {
    await peer.click(disclosure);
  }
  await instructions(peer.page).waitFor({ timeout: TIMEOUT });
};

const openSpec = async (peer) => {
  await peer.click(plank(peer.page).getByTestId('projectsPlugin.tab.spec'));
  await specLine(peer.page, PROSE).waitFor({ timeout: TIMEOUT });
};

export const steps = [
  {
    name: 'Both peers boot with their own identity and name',
    setup: true,
    run: async ({ peers }) => {
      // The notice arrives a moment after boot; give it the chance to appear before clearing it.
      await peers.alice.page.waitForTimeout(3_000);
      for (const peer of [peers.alice, peers.bob]) {
        await clearChrome(peer);
        // Names the caret labels.
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
    name: `Alice creates "${PROJECT}" with a spec and a feature`,
    setup: true,
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      const entryWorkspace = workspaceOf(page);
      await page.getByTestId('spacePlugin.addSpace').click();
      await page.getByTestId('spacePlugin.createSpace').click();
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await page.getByTestId('create-space-dialog').getByTestId('save-button').click();
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      // The dialog closes before the space opens; creating the project sooner files it in the entry space.
      await waitFor(
        () => {
          const workspace = workspaceOf(page);
          return !!workspace && workspace !== entryWorkspace;
        },
        { what: `"${SPACE}" to open` },
      );
      await currentWorkspace(page).getByText(SPACE).first().waitFor({ timeout: TIMEOUT });

      await currentWorkspace(page).getByTestId('spacePlugin.createObject').first().click();
      await page.getByTestId('create-object-form.type.org.dxos.type.project').click({ timeout: TIMEOUT });
      await page.getByTestId('create-project-panel.name-input').fill(PROJECT);
      await dialog(page).getByTestId('save-button').click();
      await page.getByTestId('create-project-panel.name-input').waitFor({ state: 'detached', timeout: TIMEOUT });
      await notes(page).waitFor({ timeout: TIMEOUT });
      projectUrl = page.url();
      // A new project opens its Help companion, which narrows the plank until the spec toolbar overflows.
      await clearChrome(alice);

      await plank(page).getByTestId('projectsPlugin.tab.spec').click();
      await plank(page).getByTestId('projectsPlugin.addSpec').first().click();
      await dialog(page).getByPlaceholder('Name').fill(SPEC);
      await dialog(page).getByTestId('save-button').click();
      await dialog(page).waitFor({ state: 'detached', timeout: TIMEOUT });
      await clearChrome(alice);
      await showSpec(page);
      await plank(page).getByTestId('projectsPlugin.specExtensions').click({ timeout: TIMEOUT });
      await page.locator('[role="menu"] >> [role="menuitemcheckbox"]:has-text("Software")').click();
      await page.keyboard.press('Escape');

      await specDocument(page).locator('.cm-content').click();
      await page.keyboard.type(`${PROSE}\n\n${FEATURE} /feature`, { delay: 10 });
      // Enter before an option is selected inserts a newline instead of the feature.
      await page.locator('.cm-tooltip-autocomplete [aria-selected="true"]').waitFor({ timeout: 10_000 });
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await featureDescription(page).waitFor({ timeout: TIMEOUT });
      await featureDescription(page).click();
      await page.keyboard.type(FEATURE_DESCRIPTION, { delay: 10 });
      await specDocument(page).getByTestId('requirement-editor.add').click();
      await editable(featureField(page, 'requirement-editor.0.text')).waitFor({ timeout: TIMEOUT });
      await page.keyboard.type(REQUIREMENT, { delay: 10 });
      await plank(page).getByTestId('projectsPlugin.tab.overview').click();
      await notes(page).waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Alice invites Bob; Bob opens the project',
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
      const sharedWorkspace = workspaceOf(alice.page);
      await expandRow(currentWorkspace(alice.page).getByTestId('spacePlugin.settings').first());
      await currentWorkspace(alice.page)
        .getByTestId('spacePlugin.members')
        .first()
        .getByTestId('treeItem.heading')
        .first()
        .click();
      const invitationCode = alice.nextConsoleValue('invitationCode');
      const authCode = alice.nextConsoleValue('authCode');
      await alice.page.getByTestId('membersContainer.createInvitation.more').click();
      await alice.page.getByTestId('membersContainer.inviteOne').click();
      await alice.page.getByTestId('membersContainer.createInvitation').click();

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

      await clearChrome(bob);
      await openProject(alice);
      await openProject(bob);
      await clearChrome(alice);
      await clearChrome(bob);
    },
  },
  {
    name: "The project's name and description: each sees the other's caret",
    subtitle: 'plugin-projects QA-10 step 1',
    run: async ({ peers: { alice, bob } }) => {
      // An unset description is created when its editor takes focus, which rebinds the editor before typing.
      const description = (page) => editable(projectField(page, 'description'));
      await bob.click(description(bob.page));
      await waitFor(() => focusedIn(description(bob.page)), {
        timeout: 10_000,
        what: "Bob's project description to take focus",
      });
      await bob.type(PROJECT_DESCRIPTION);
      await expectCaret(projectField(alice.page, 'description'), 'Bob', "Alice's project description");
      await hold(alice);
      await alice.click(editable(projectField(alice.page, 'name')).locator('.cm-line').first());
      await alice.page.keyboard.press('End');
      await expectCaret(projectField(bob.page, 'name'), 'Alice', "Bob's project name");
      await hold(alice);
    },
  },
  {
    name: "Notes: each sees the other's caret",
    subtitle: 'plugin-projects QA-10 step 2',
    run: async ({ peers: { alice, bob } }) => {
      await alice.click(notes(alice.page).getByRole('textbox'));
      await alice.type(NOTES);
      await expectCaret(notes(bob.page), 'Alice', "Bob's Notes");
      await hold(alice);
      await bob.click(notes(bob.page).getByRole('textbox'));
      await bob.page.keyboard.press('ControlOrMeta+End');
      await expectCaret(notes(alice.page), 'Bob', "Alice's Notes");
      await hold(alice);
    },
  },
  {
    name: 'Agent instructions: Bob writes, Alice sees his caret',
    subtitle: 'plugin-projects QA-10 step 3',
    run: async ({ peers: { alice, bob } }) => {
      await openAgent(alice);
      await openAgent(bob);
      await bob.click(instructions(bob.page));
      await bob.type(INSTRUCTIONS);
      await expectCaret(agent(alice.page), 'Bob', "Alice's instructions");
      await hold(alice);
      await alice.click(instructions(alice.page));
      await alice.page.keyboard.press('ControlOrMeta+End');
      await expectCaret(agent(bob.page), 'Alice', "Bob's instructions");
      await hold(alice);
    },
  },
  {
    name: "Spec: Bob adds to the prose under Alice's caret",
    subtitle: 'plugin-projects QA-10 step 4',
    run: async ({ peers: { alice, bob } }) => {
      await openSpec(alice);
      await openSpec(bob);
      await alice.click(specLine(alice.page, PROSE));
      await alice.page.keyboard.press('End');
      await expectCaret(specDocument(bob.page), 'Alice', "Bob's spec");
      await hold(alice);
      await bob.click(specLine(bob.page, PROSE));
      await bob.page.keyboard.press('End');
      await bob.type(PROSE_ADDITION);
      await expectCaret(specDocument(alice.page), 'Bob', "Alice's spec");
      await hold(alice);
    },
  },
  {
    name: "A feature's name and description: Bob in the name, Alice in the description",
    subtitle: 'plugin-projects QA-10 step 5',
    run: async ({ peers: { alice, bob } }) => {
      // The feature card's wrapper takes the pointer first, so clicks are forced through to the text's own line.
      const line = (page, testId) => editable(featureField(page, testId)).locator('.cm-line').first();
      await bob.click(line(bob.page, 'name'), { force: true });
      await bob.page.keyboard.press('End');
      await expectCaret(featureField(alice.page, 'name'), 'Bob', "Alice's feature name");
      await hold(alice);
      await alice.click(line(alice.page, 'description'), { force: true });
      await alice.page.keyboard.press('ControlOrMeta+End');
      await waitFor(() => focusedIn(featureDescription(alice.page)), {
        timeout: 10_000,
        what: "Alice's description to take focus",
      });
      await alice.type(DESCRIPTION_ADDITION);
      await expectCaret(featureField(bob.page, 'description'), 'Alice', "Bob's feature description");
      await hold(alice);
    },
  },
  {
    name: "A feature's requirement: each sees the other's caret",
    subtitle: 'plugin-projects QA-10 step 6',
    run: async ({ peers: { alice, bob } }) => {
      const requirement = (page) => featureField(page, 'requirement-editor.0.text');
      const line = (page) => editable(requirement(page)).locator('.cm-line').first();
      await alice.click(line(alice.page), { force: true });
      await alice.page.keyboard.press('End');
      await alice.type(REQUIREMENT_ADDITION);
      await expectCaret(requirement(bob.page), 'Alice', "Bob's requirement");
      await hold(alice);
      await bob.click(line(bob.page), { force: true });
      await bob.page.keyboard.press('End');
      await expectCaret(requirement(alice.page), 'Bob', "Alice's requirement");
      await hold(alice);
    },
  },
];

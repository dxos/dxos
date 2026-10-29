//
// Copyright 2026 DXOS.org
//

/**
 * Devtools' Agent > HALO page reads an agent's HALO from EDGE, which no client replicates. Alice, who created Kai,
 * opens DevTools > Agent > HALO and picks Kai: its identity, HALO space, admins and spaces, then every credential in its
 * HALO, one `IdentityAdmin` among them for her. She invites Bob into Kai's space, which makes her client ask EDGE to add
 * him as an admin; when she picks Kai again, the page shows two admins and a second `IdentityAdmin`, for Bob.
 *
 * @mdl packages/plugins/plugin-devtools/PLUGIN.mdl test QA-3
 * @app composer-app dev server on 127.0.0.1:4173 against a local EDGE with the halo route (dxos/edge#1374):
 *
 *   DX_EDGE_BASE_URL=http://localhost:8787 DX_STRICT=false DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true \
 *     moon run composer-app:serve -- --port 4173 --host 127.0.0.1
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-devtools/autocue/agent-halo.mjs --out /tmp/pair --mp4 on
 *
 * No step talks to Kai, so EDGE needs no model key. Keep the file free of imports, since it is loaded from outside
 * the workspace.
 */

const AGENT = 'Kai';
/** Alice's shared space, where she creates Kai; a personal space admits no members, Kai included. */
const HOME = 'Studio';
const SETTING = 'Create identities for agents';
const TIMEOUT = 60_000;
/** Creating an agent provisions its identity and space on EDGE before the space reaches the client. */
const PROVISION_TIMEOUT = 120_000;
const ORIGIN = 'http://127.0.0.1:4173';
const AGENT_PLUGIN = 'org.dxos.plugin.agent';
const DEBUG_PLUGIN = 'org.dxos.plugin.debug';
const DEVTOOLS_PLUGIN = 'org.dxos.plugin.devtools';

/** How far, in CSS pixels, the debug drawer is dragged taller. */
const DRAWER_GROWTH = 360;

const PLANK = '[data-testid="deck.plank"]';
const PROMPT = `${PLANK} [data-testid="assistant.prompt"] .cm-content`;

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

/** The workspace segment of the URL (`/w/<workspace>/...`). */
const workspaceOf = (page) => {
  const [anchor, workspace] = new URL(page.url()).pathname.split('/').filter(Boolean);
  return anchor === 'w' ? decodeURIComponent(workspace) : undefined;
};

const currentWorkspace = (page) => page.getByTestId('navtree.workspace.visible');

/** The rail tab of a space, by its name. */
const spaceTab = (page, name) => page.getByTestId('spacePlugin.space').filter({ hasText: name }).first();

/** Expands a navtree row unless it is already open. */
const expandRow = async (peer, row) => {
  const toggle = row.locator('[data-part="branch-trigger"]').first();
  await toggle.waitFor({ state: 'attached', timeout: TIMEOUT });
  if ((await toggle.getAttribute('data-state')) === 'open') {
    return;
  }
  await row.hover();
  await waitFor(() => toggle.isEnabled(), { what: 'the row to become expandable' });
  await peer.click(toggle);
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

/** The name of the space the navtree shows: its header. */
const currentSpace = (page) =>
  currentWorkspace(page)
    .first()
    .innerText()
    .then((text) => text.split('\n')[0].trim())
    .catch(() => undefined);

/**
 * Opens a space by name, through the layout's switch-workspace operation: the rail's tab is a tooltip trigger whose
 * click Playwright cannot land reliably while a space is still opening. The tab's value is the workspace id.
 */
const openSpace = async ({ page }, name) => {
  const tab = spaceTab(page, name);
  await tab.waitFor({ state: 'attached', timeout: TIMEOUT });
  const workspace = await tab.getAttribute('data-value');
  await waitFor(
    async () => {
      if ((await currentSpace(page)) === name) {
        return true;
      }
      await page.evaluate(
        (subject) => globalThis.composer.invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject }),
        workspace,
      );
      return false;
    },
    { what: `the space "${name}" to open` },
  );
};

/** Opens a section of the current space's settings in the navtree, by its row's test id. */
const openSpaceSettings = async (peer, testId) => {
  const { page } = peer;
  await expandRow(peer, currentWorkspace(page).getByTestId('spacePlugin.settings').first());
  await peer.click(currentWorkspace(page).getByTestId(testId).first().getByTestId('treeItem.heading').first());
};

/** The identities switch on plugin-agent's settings page, which `gesture` reaches from the rail's Settings. */
const identitiesSwitch = async (page, gesture) => {
  await gesture(page.getByTestId('treeView.appSettings').first());
  await gesture(page.getByTestId(`settings.${AGENT_PLUGIN}`).first());
  // A settings row labels its switch from its header column, so the switch is found beside the setting's title.
  const toggle = page
    .getByText(SETTING, { exact: true })
    .first()
    .locator('xpath=ancestor::*[.//*[@data-scope="switch"]][1]')
    .locator('[data-scope="switch"][data-part="root"]')
    .first();
  await toggle.waitFor({ timeout: TIMEOUT });
  return toggle;
};

const isOn = async (toggle) =>
  (await toggle.getAttribute('data-state')) === 'checked' ||
  (await toggle
    .locator('input[type="checkbox"]')
    .isChecked()
    .catch(() => false));

/** Turns the setting on; `gesture` clicks on camera or off. */
const enableIdentities = async (page, gesture) => {
  const toggle = await identitiesSwitch(page, gesture);
  if (!(await isOn(toggle))) {
    await gesture(toggle);
  }
  await waitFor(() => isOn(toggle), { what: `"${SETTING}" to be on` });
};

/** Whether one of the peer's spaces, other than Kai's own, lists Kai among its members. */
const listsAgentAsMember = (page) =>
  page.evaluate(
    (agent) =>
      (globalThis.dxos?.client?.spaces.get() ?? []).some(
        (space) =>
          !space.tags.includes('org.dxos.space.agent') &&
          space.members.get().some((member) => member.identity?.profile?.displayName === agent),
      ),
    AGENT,
  );

/**
 * Opens DevTools > Agent > HALO from the status bar's debug panel; `remount` passes through Console first, so the page
 * reads EDGE afresh.
 */
const openAgentHalo = async (peer, { remount = false } = {}) => {
  const { page } = peer;
  // The debug panel's tree, told apart from the navtree by its Console page.
  const tree = page
    .locator('[role="tree"]')
    .filter({ has: page.locator('[role="treeitem"]').filter({ hasText: /^Console$/ }) })
    .first();
  if (!(await tree.isVisible().catch(() => false))) {
    await peer.click(page.getByRole('button', { name: 'Show debug panel' }).first());
    await tree.waitFor({ timeout: TIMEOUT });
    // The credentials grid renders only the rows in view, and the drawer opens at 24rem, two rows' worth.
    const handle = page.getByRole('separator', { name: 'Resize drawer' }).first();
    const box = await handle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y - DRAWER_GROWTH, { steps: 20 });
      await page.mouse.up();
    }
  }
  if (remount) {
    await peer.click(
      tree
        .locator('[role="treeitem"]')
        .filter({ hasText: /^Console$/ })
        .first(),
    );
  }
  // Selecting a branch toggles it, so only a closed one is clicked.
  for (const branch of [/^DevTools$/, /^Agent$/]) {
    const item = tree.locator('[role="treeitem"]').filter({ hasText: branch }).first();
    await item.waitFor({ timeout: TIMEOUT });
    if ((await item.getAttribute('aria-expanded')) !== 'true') {
      await peer.click(item);
    }
  }
  // DevTools > HALO is a closed branch above Agent, so the last HALO row is the agent's page.
  await peer.click(
    tree
      .locator('[role="treeitem"]')
      .filter({ hasText: /^HALO$/ })
      .last(),
  );
  await agentSelect(page).waitFor({ timeout: TIMEOUT });
};

/** The page's two selectors: the agent, then the view. */
const agentSelect = (page) =>
  page
    .locator('[data-scope="select"][data-part="trigger"]')
    .filter({ hasText: new RegExp(`Select agent|^${AGENT}$`) })
    .first();
const viewSelect = (page) =>
  page
    .locator('[data-scope="select"][data-part="trigger"]')
    .filter({ hasText: /^(identity|credentials)$/ })
    .first();

const choose = async (peer, trigger, text) => {
  await peer.click(trigger);
  await peer.click(
    peer.page.locator('[data-scope="select"][data-part="item"]:visible').filter({ hasText: text }).first(),
  );
};

/** The page's JSON once EDGE has answered: the identity view carries `adminKeys` only after the fetch. */
const haloJson = (page) => page.locator('pre, [data-testid="json-view"]').filter({ hasText: 'adminKeys' }).first();

/** How many admins the identity view lists. */
const adminCount = async (page) => {
  const text = await haloJson(page)
    .innerText()
    .catch(() => '');
  const match = /"?adminKeys"?\s*:\s*\[([^\]]*)\]/s.exec(text);
  return match ? match[1].split(',').filter((entry) => entry.trim().length > 0).length : 0;
};

/** Every row of the credentials table, for a failure to say what it held. */
const rowTexts = async (page) =>
  JSON.stringify(
    await page
      .locator('[role="row"], tr')
      .allInnerTexts()
      .catch(() => []),
  );

/** The credentials table's body cells that hold a credential's type, its first column. */
const typeCells = (page) => page.locator('[role="gridcell"][aria-colindex="0"]');

/** The credentials of a type, one type cell each. */
const credentialRows = (page, type) =>
  page.locator('[role="gridcell"]').filter({ hasText: new RegExp(`^\\s*${type}\\s*$`) });

export const steps = [
  {
    name: 'Both people boot with their own identity, the agent plugin and a name; Alice creates Kai in Studio',
    setup: true,
    run: async ({ peers }) => {
      await peers.alice.page.waitForTimeout(3_000);
      for (const [peer, displayName] of [
        [peers.alice, 'Alice'],
        [peers.bob, 'Bob'],
      ]) {
        const { page } = peer;
        // plugin-agent, plugin-debug and plugin-devtools are tagged labs, so they are off until enabled in the registry.
        await page.goto(`${ORIGIN}/w/dxos:registry`);
        await page.getByTestId('pluginRegistry.labs').click();
        for (const plugin of displayName === 'Alice' ? [AGENT_PLUGIN, DEBUG_PLUGIN, DEVTOOLS_PLUGIN] : [AGENT_PLUGIN]) {
          const row = page.getByTestId(`pluginList.${plugin}`);
          await row.waitFor({ timeout: TIMEOUT });
          if (!(await row.locator('input[type="checkbox"]').isChecked())) {
            await row.locator('[data-scope="switch"][data-part="root"]').click();
          }
          await waitFor(() => row.locator('input[type="checkbox"]').isChecked(), {
            what: `${displayName}'s ${plugin}`,
          });
        }
        await page.evaluate(
          (name) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName: name }),
          displayName,
        );
        await page.getByTestId('spacePlugin.space').first().click();
        await page.getByTestId('deck.plank').first().waitFor({ timeout: TIMEOUT });
      }
      const alice = peers.alice;
      const { page } = alice;
      await enableIdentities(page, (locator) => locator.click());
      await page.getByTestId('spacePlugin.addSpace').first().click();
      await page.getByRole('menuitem', { name: 'Create space' }).click();
      await page.locator('[data-testid="create-space-dialog"] input[placeholder="Name"]').fill(HOME);
      await page.locator('[data-testid="create-space-dialog"] button:has-text("Create")').last().click();
      await spaceTab(page, HOME).waitFor({ timeout: TIMEOUT });
      await openSpace(alice, HOME);
      const quiet = { click: (locator) => locator.click(), page };
      await openSpaceSettings(quiet, 'agentPlugin.agentsSection');
      await page.getByTestId('agentPlugin.addAgentName').first().fill(AGENT);
      await page.getByTestId('agentPlugin.addAgent').first().click();
      await page.locator(PROMPT).first().waitFor({ timeout: TIMEOUT });
      // The membership EDGE returns, written to Alice's HALO, brings Kai's space into her space list.
      await spaceTab(page, AGENT).waitFor({ timeout: PROVISION_TIMEOUT });
      await waitFor(() => listsAgentAsMember(page), { timeout: PROVISION_TIMEOUT, what: `${AGENT} to join ${HOME}` });
      await openSpace(peers.bob, (await currentSpace(peers.bob.page)) ?? '');
      await Promise.all([clearChrome(peers.alice), clearChrome(peers.bob)]);
      await Promise.all([peers.alice.page.mouse.move(500, 500), peers.bob.page.mouse.move(500, 500)]);
    },
  },
  {
    name: 'Alice opens DevTools > Agent > HALO and picks Kai',
    subtitle: "Its identity, HALO space, admins and spaces, read from EDGE: no client replicates an agent's HALO",
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await openAgentHalo(alice);
      await choose(alice, agentSelect(page), AGENT);
      await haloJson(page).waitFor({ timeout: TIMEOUT });
      await waitFor(async () => (await adminCount(page)) === 1, { what: 'one admin, Alice' });
      await page.waitForTimeout(3_000);
    },
  },
  {
    name: "Alice switches to the credentials in Kai's HALO",
    subtitle: 'The genesis, its device, and one IdentityAdmin: the credential EDGE issued when Alice created Kai',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await choose(alice, viewSelect(page), 'credentials');
      await waitFor(async () => (await credentialRows(page, 'IdentityAdmin').count()) === 1, {
        what: 'one IdentityAdmin credential',
      }).catch(async (error) => {
        throw new Error(`${error.message}; types now ${await rowTexts(page)}`);
      });
      await page.waitForTimeout(3_000);
    },
  },
  {
    name: "Alice invites Bob into Kai's space",
    subtitle: "Whoever can edit Kai's space administers Kai: her client asks EDGE to add Bob",
    run: async ({ peers: { alice, bob } }) => {
      await openSpace(alice, AGENT);
      await clearChrome(alice);
      await openSpaceSettings(alice, 'spacePlugin.members');
      const agentWorkspace = workspaceOf(alice.page);
      const invitationCode = alice.nextConsoleValue('invitationCode');
      const authCode = alice.nextConsoleValue('authCode');
      await alice.click(alice.page.getByTestId('membersContainer.createInvitation.more'));
      await alice.click(alice.page.getByTestId('membersContainer.inviteOne'));
      await alice.click(alice.page.getByTestId('membersContainer.createInvitation'));

      await bob.click(bob.page.getByTestId('spacePlugin.addSpace'));
      await bob.click(bob.page.getByTestId('spacePlugin.joinSpace'));
      const input = bob.page.getByTestId('space-invitation-input');
      await bob.click(input);
      await input.fill(await invitationCode);
      await bob.page.keyboard.press('Enter');
      const pin = bob.page.locator("[data-testid='space-auth-code-input']:visible");
      await pin.waitFor({ timeout: TIMEOUT });
      await bob.click(pin.locator('input').first());
      await bob.type(await authCode, { delay: 120 });
      await bob.click(bob.page.getByTestId('space-invitation-authenticator-next'));
      await waitFor(() => workspaceOf(bob.page) === agentWorkspace, { what: `Bob to reach ${AGENT}'s space` });
      await clearChrome(bob);
    },
  },
  {
    name: 'Alice picks Kai again: two admins',
    subtitle: 'EDGE answers with the admins it now holds, Bob beside Alice',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      // The page reads EDGE when an agent is picked, so it is reopened to pick Kai afresh.
      await waitFor(
        async () => {
          await openAgentHalo(alice, { remount: true });
          await choose(alice, agentSelect(page), AGENT);
          await haloJson(page).waitFor({ timeout: TIMEOUT });
          if ((await adminCount(page)) === 2) {
            return true;
          }
          await page.waitForTimeout(3_000);
          return false;
        },
        { timeout: PROVISION_TIMEOUT, what: 'two admins' },
      );
      await page.waitForTimeout(3_000);
    },
  },
  {
    name: 'The credentials now hold a second IdentityAdmin, for Bob',
    subtitle: "EDGE issued it into Kai's HALO when it added him",
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await choose(alice, viewSelect(page), 'credentials');
      await waitFor(async () => (await credentialRows(page, 'IdentityAdmin').count()) === 2, {
        what: 'two IdentityAdmin credentials',
      });
      // Its details name the admin it was issued for.
      await alice.click(credentialRows(page, 'IdentityAdmin').last());
      await page.waitForTimeout(6_000);
    },
  },
];

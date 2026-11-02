//
// Copyright 2026 DXOS.org
//

/**
 * Agent identities, end to end. Alice turns on Settings › Plugins › Agent › "Create identities for agents" and adds
 * Kai in her space's Settings › Agents: EDGE mints its identity and its own space, Kai joins her space as a member,
 * and Profile › Agents lists it with Alice as its admin. She invites Bob into Kai's space, which makes him an admin
 * too, and tells Kai about the team offsite in Lisbon. Bob, who is not in Alice's space, adds Kai to his own space from
 * its Members panel and asks it what is planned: Kai answers there from what Alice told it — recorded side by side,
 * one browser per person.
 *
 * @mdl packages/plugins/plugin-agent/PLUGIN.mdl test QA-5
 * @app composer-app dev server on 127.0.0.1:4173 against a local EDGE with agent identities (dxos/edge#1293) and
 * DID-named brains (dxos/edge#1313), whose AI service has a model key:
 *
 *   DX_EDGE_BASE_URL=http://localhost:8787 DX_STRICT=false DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true \
 *     moon run composer-app:serve -- --port 4173 --host 127.0.0.1
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-agent/autocue/agent-identities.mjs --out /tmp/pair --mp4 on
 *
 * Bob's setting is turned on off camera. The replies come from a live model, so the steps wait for each reply to
 * settle rather than for its words. Creating Kai is timed and logged as `[timing]`. Keep the file free of imports,
 * since it is loaded from outside the workspace.
 */

const AGENT = 'Kai';
/** Alice's shared space, where she creates Kai; a personal space admits no members, Kai included. */
const HOME = 'Studio';
/** Bob's own space, which he adds Kai to. */
const OTHER = 'Offsite team';
const SETTING = 'Create identities for agents';
const MESSAGES = [
  `Hi ${AGENT}, I'm Alice. Our team offsite is in Lisbon on November 14, for 12 people, and Dima is booking the venue.`,
  'The budget is 8,000 euros, and flights are still open.',
];
const QUESTION = 'Check your memory: what do we have so far for the offsite?';
const TIMEOUT = 60_000;
/** Creating an agent provisions its identity and space on EDGE before the space reaches the client. */
const PROVISION_TIMEOUT = 120_000;
/** A live agent turn on EDGE (spawn, tools, model) took 15–90 s when probed. */
const REPLY_TIMEOUT = 240_000;
/** How long a reply must stay unchanged to count as finished: a turn streams, then runs its tools. */
const SETTLED_MS = 4_000;
const ORIGIN = 'http://127.0.0.1:4173';
const AGENT_PLUGIN = 'org.dxos.plugin.agent';

const PLANK = '[data-testid="deck.plank"]';
const PROMPT = `${PLANK} [data-testid="assistant.prompt"] .cm-content`;
const FEED = `${PLANK} [data-testid="feed.message"]`;
/** Rendered only while a turn runs. */
const ACTIVITY = `${PLANK} [data-testid="assistant.chat-activity"]`;
const TOOL_ROW = '[data-testid^="assistant.tool-"]';

/** Milliseconds from the click on Add agent to each milestone of making Kai, logged rather than shown. */
const timing = {};

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

/** The workspace segment of the URL (`/w/<workspace>/…`). */
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

/** A navtree row of the current workspace, by its heading. */
const treeRow = (page, heading) =>
  currentWorkspace(page)
    .locator(`[role="treeitem"]:has([data-testid="treeItem.heading"]:text-is("${heading}"))`)
    .first();

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

/** Opens the agent's chat from the current space's Settings › Agents, whose list opens an agent on click. */
const openAgent = async (peer) => {
  const { page } = peer;
  await openSpaceSettings(peer, 'agentPlugin.agentsSection');
  await peer.click(
    page.locator(`${PLANK} [data-scope="listbox"][data-part="item"]`).filter({ hasText: AGENT }).first(),
  );
  await page.locator(PROMPT).first().waitFor({ timeout: TIMEOUT });
};

/** Whether the named space holds an agent called Kai, as op:listAgents reports it. */
const holdsAgent = (page, spaceName) =>
  page.evaluate(
    async ([name, agent]) => {
      const space = (globalThis.dxos?.client?.spaces.get() ?? []).find((space) => space.properties?.name === name);
      if (!space) {
        return false;
      }
      const listed = await globalThis.composer
        .invoke('org.dxos.operation.agent.list', {}, { spaceId: space.id })
        .catch(() => undefined);
      return (listed?.agents ?? []).some((entry) => entry.name === agent);
    },
    [spaceName, AGENT],
  );

/**
 * Waits for the turn a message started to finish: the chat's activity indicator (shown only while a turn runs) is
 * gone, the last message is words rather than a tool row, and nothing has changed for a while.
 */
const waitForReply = async (page, before) => {
  const deadline = Date.now() + REPLY_TIMEOUT;
  const feed = page.locator(FEED);
  let previous = '';
  let changedAt = Date.now();
  for (;;) {
    const texts = await feed.allInnerTexts();
    const snapshot = texts.join('\n');
    if (snapshot !== previous) {
      previous = snapshot;
      changedAt = Date.now();
    }
    const busy = (await page.locator(ACTIVITY).count()) > 0;
    const last = texts.length >= before + 2 ? feed.nth(texts.length - 1) : undefined;
    const words = last && (await last.locator(TOOL_ROW).count()) === 0 && texts.at(-1).trim().length > 0;
    if (!busy && words && Date.now() - changedAt > SETTLED_MS) {
      return texts.at(-1).trim();
    }
    if (Date.now() > deadline) {
      throw new Error(`no finished reply within ${REPLY_TIMEOUT / 1_000}s`);
    }
    await page.waitForTimeout(500);
  }
};

/** Types a message into the open chat as a person would, sends it, and waits for the reply. */
const send = async (peer, text) => {
  const { page } = peer;
  const before = await page.locator(FEED).count();
  await peer.click(page.locator(PROMPT).first());
  await peer.type(text, { delay: 20 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  return waitForReply(page, before);
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

/** Kai's row in the account's Agents panel. */
const agentRow = (page) => page.getByTestId('agent-list.item').filter({ hasText: AGENT }).first();

/** Opens the profile from the rail, then its Agents panel, and waits for Kai's row. */
const openAgentsPanel = async (peer) => {
  const { page } = peer;
  if (workspaceOf(page) !== 'dxos:account') {
    await peer.click(page.getByTestId('clientPlugin.account').first());
  }
  await peer.click(page.getByTestId('agentPlugin.agents').first());
  await agentRow(page).waitFor({ timeout: TIMEOUT });
};

export const steps = [
  {
    name: "Both people boot with their own identity, the agent plugin and a name; Bob's identities setting is on",
    setup: true,
    run: async ({ peers }) => {
      await peers.alice.page.waitForTimeout(3_000);
      const people = [
        [peers.alice, 'Alice'],
        [peers.bob, 'Bob'],
      ];
      for (const [peer, displayName] of people) {
        const { page } = peer;
        // plugin-agent is tagged labs, so it is off until enabled in the registry.
        await page.goto(`${ORIGIN}/w/dxos:registry`);
        await page.getByTestId('pluginRegistry.labs').click();
        const row = page.getByTestId(`pluginList.${AGENT_PLUGIN}`);
        await row.waitFor({ timeout: TIMEOUT });
        if (!(await row.locator('input[type="checkbox"]').isChecked())) {
          await row.locator('[data-scope="switch"][data-part="root"]').click();
        }
        await waitFor(() => row.locator('input[type="checkbox"]').isChecked(), {
          what: `${displayName}'s agent plugin`,
        });
        await page.evaluate(
          (name) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName: name }),
          displayName,
        );
        // Back to the personal space through the rail; a reload would restore the registry workspace.
        await page.getByTestId('spacePlugin.space').first().click();
        await page.getByTestId('deck.plank').first().waitFor({ timeout: TIMEOUT });
      }
      await enableIdentities(peers.bob.page, (locator) => locator.click());
      // Alice's space, where she creates Kai, and Bob's, which he later adds Kai to.
      for (const [{ page }, spaceName] of [
        [peers.alice, HOME],
        [peers.bob, OTHER],
      ]) {
        await page.getByTestId('spacePlugin.addSpace').first().click();
        await page.getByRole('menuitem', { name: 'Create space' }).click();
        await page.locator('[data-testid="create-space-dialog"] input[placeholder="Name"]').fill(spaceName);
        await page.locator('[data-testid="create-space-dialog"] button:has-text("Create")').last().click();
        await spaceTab(page, spaceName).waitFor({ timeout: TIMEOUT });
      }
      await openSpace(peers.alice, HOME);
      await openSpace(peers.bob, OTHER);
      await peers.alice.page.waitForTimeout(2_000);
      await Promise.all([clearChrome(peers.alice), clearChrome(peers.bob)]);
      await Promise.all([peers.alice.page.mouse.move(500, 500), peers.bob.page.mouse.move(500, 500)]);
      const names = await Promise.all(
        [peers.alice, peers.bob].map(({ page }) =>
          page.evaluate(() => globalThis.dxos?.client?.halo.identity.get()?.profile?.displayName),
        ),
      );
      if (names[0] !== 'Alice' || names[1] !== 'Bob') {
        throw new Error(`display names not set: ${JSON.stringify(names)}`);
      }
    },
  },
  {
    name: `Alice turns on "${SETTING}"`,
    subtitle: 'QA-5 step 1: Settings › Plugins › Agent; it is off by default, and agents work without identities',
    run: async ({ peers: { alice } }) => {
      await enableIdentities(alice.page, (locator) => alice.click(locator));
      await alice.page.waitForTimeout(1_500);
    },
  },
  {
    name: `Alice adds an agent named ${AGENT} in ${HOME}'s Settings › Agents`,
    subtitle: 'QA-5 step 2: its identity and its own space are minted on EDGE',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await openSpace(alice, HOME);
      await openSpaceSettings(alice, 'agentPlugin.agentsSection');
      const name = page.getByTestId('agentPlugin.addAgentName').first();
      await alice.click(name);
      await alice.type(AGENT);
      await alice.click(page.getByTestId('agentPlugin.addAgent').first());
      const created = Date.now();
      // Kai is admitted to Alice's space in the background, after EDGE mints its identity.
      timing.membership = waitFor(() => listsAgentAsMember(page), {
        timeout: PROVISION_TIMEOUT,
        what: `${AGENT} to be a member of Alice's space`,
      }).then(() => (timing.member = Date.now() - created));
      const prompt = page.locator(PROMPT).first();
      await prompt.waitFor({ timeout: TIMEOUT });
      await waitFor(() => prompt.isEditable(), { what: `${AGENT}'s prompt to take a message` });
      timing.prompt = Date.now() - created;
      // The membership EDGE returns, written to Alice's HALO, brings Kai's space into her space list.
      await spaceTab(page, AGENT).waitFor({ timeout: PROVISION_TIMEOUT });
      timing.space = Date.now() - created;
      console.log(`[timing] ${JSON.stringify({ promptReadyMs: timing.prompt, agentSpaceMs: timing.space })}`);
      await clearChrome(alice);
    },
  },
  {
    name: `Alice opens ${HOME}'s members: ${AGENT} is one of them`,
    subtitle: 'QA-5 step 3: its identity is admitted to the shared space it was created in',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await openSpaceSettings(alice, 'spacePlugin.members');
      const members = page.getByTestId('space-members-list').first();
      await waitFor(async () => (await members.innerText().catch(() => '')).includes(AGENT), {
        timeout: PROVISION_TIMEOUT,
        what: `the members to list ${AGENT}`,
      });
      await timing.membership;
      console.log(`[timing] ${JSON.stringify({ memberMs: timing.member })}`);
      await page.waitForTimeout(3_000);
    },
  },
  {
    name: `Alice opens Profile › Agents: ${AGENT} is listed`,
    subtitle: 'QA-5 step 4: the agents she administers, read from her own spaces',
    run: async ({ peers: { alice } }) => {
      await openAgentsPanel(alice);
      // QA-5 expects a chip for the agent's own space and one for Alice's.
      const chips = agentRow(alice.page).getByTestId('agent-list.space');
      for (const space of [AGENT, HOME]) {
        await chips.getByText(space, { exact: true }).waitFor({ timeout: TIMEOUT });
      }
    },
  },
  {
    name: `Alice invites Bob into ${AGENT}'s space`,
    subtitle: "QA-5 step 5: Kai's space from its row, then Settings › Members",
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      // The agent's own space is named after it.
      await alice.click(agentRow(page).getByTestId('agent-list.space').getByText(AGENT, { exact: true }));
      await waitFor(
        async () =>
          (await currentWorkspace(page)
            .getByTestId('spacePlugin.settings')
            .count()
            .catch(() => 0)) > 0,
        { what: `${AGENT}'s space to open` },
      );
      // A space's first visit opens the Help companion beside its Home.
      await clearChrome(alice);
      await openSpaceSettings(alice, 'spacePlugin.members');
    },
  },
  {
    name: `Bob joins ${AGENT}'s space with the code and the PIN`,
    subtitle: 'QA-5 step 6: an ordinary space invitation',
    run: async ({ peers: { alice, bob } }) => {
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
      await spaceTab(bob.page, AGENT).waitFor({ timeout: TIMEOUT });
      await clearChrome(bob);
    },
  },
  {
    name: `Bob opens Profile › Agents: ${AGENT} is listed`,
    subtitle: "QA-5 step 7: whoever can edit the agent's space administers the agent",
    run: async ({ peers: { bob } }) => {
      await openAgentsPanel(bob);
    },
  },
  {
    name: `Alice tells ${AGENT} about the team offsite in Lisbon`,
    subtitle: "QA-5 step 8: Kai's turns run on EDGE, which keeps what it learns in Kai's brain",
    run: async ({ peers: { alice } }) => {
      await openSpace(alice, HOME);
      await openAgent(alice);
      await clearChrome(alice);
      await send(alice, MESSAGES[0]);
    },
  },
  {
    name: 'Alice adds the budget',
    subtitle: 'QA-5 step 9',
    run: async ({ peers: { alice } }) => {
      await send(alice, MESSAGES[1]);
      await alice.page.waitForTimeout(2_000);
    },
  },
  {
    name: `Bob adds ${AGENT} to "${OTHER}" from Members › Add from contacts`,
    subtitle: "QA-5 step 10: as Kai's admin he can, and Kai becomes a member of the space; EDGE checks it",
    run: async ({ peers: { bob } }) => {
      const { page } = bob;
      await openSpace(bob, OTHER);
      await clearChrome(bob);
      await openSpaceSettings(bob, 'spacePlugin.members');
      await bob.click(page.getByTestId('contact-picker.trigger').first());
      await bob.click(page.getByTestId('contact-picker.item').filter({ hasText: AGENT }).first());
      await bob.click(page.getByTestId('contactPicker.add'));
      // The space lists it among its members, and holds Kai's presence, which its Settings › Agents lists.
      await waitFor(() => listsAgentAsMember(page), { what: `${OTHER} to list ${AGENT} among its members` });
      await waitFor(() => holdsAgent(page, OTHER), { what: `${OTHER} to hold ${AGENT}` });
    },
  },
  {
    name: `Bob opens ${AGENT} in "${OTHER}"`,
    subtitle: 'QA-5 step 11: his own conversation with Kai, which Alice cannot read',
    run: async ({ peers: { bob } }) => {
      await openAgent(bob);
      await clearChrome(bob);
    },
  },
  {
    name: `Bob asks ${AGENT} what is planned for the offsite`,
    subtitle: 'QA-5 step 12: Kai answers from its brain, with what Alice told it in her space',
    narration:
      "Kai keeps one brain across its spaces: Bob's question in Offsite team is answered from Alice's conversation in her own space.",
    run: async ({ peers: { bob } }) => {
      const reply = await send(bob, QUESTION);
      if (!/lisbon/i.test(reply)) {
        throw new Error(`Kai's reply does not mention Lisbon: ${reply}`);
      }
      await bob.page.waitForTimeout(10_000);
    },
  },
];

//
// Copyright 2026 DXOS.org
//

/**
 * Alice and Bob, each with their own identity, talk to one agent in their own private chats; Alice asks to be
 * kept posted on Bob, Bob says what he is working on, and the update reaches Alice — recorded side by side.
 *
 * @mdl packages/plugins/plugin-agent/PLUGIN.mdl test QA-3
 * @app composer-app `bundle-e2e` output (EDGE `https://dxos.network`), served by `vite preview` on 127.0.0.1:4173
 *
 * A flow for `pair.mjs`: every step receives both peers. The agent's chats run on EDGE (`Agent.chatLocation`),
 * so its turns, its brain and its watches are EDGE's and the model is EDGE's AI service; nothing here is
 * scripted. Built and served from `packages/apps/composer-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-agent/autocue/two-people-one-agent.mjs --out /tmp/pair --mp4 on
 *
 * Setup and invitation follow `composer-app/autocue/two-peer-collaboration.mjs`. Keep the file free of imports,
 * since it is loaded from outside the workspace.
 */

const SPACE = 'Launch room';
const ALICE_ASKS = 'Keep me posted on what Bob is working on.';
const BOB_SAYS = "I'm working on the indexer migration this week.";
/** What the update to Alice must mention for the watch to count as delivered. */
const UPDATE_PATTERN = /indexer/i;
const TIMEOUT = 60_000;
/** A live agent turn on EDGE (spawn, tools, model) took 15–90 s when probed. */
const TURN_TIMEOUT = 240_000;
const ORIGIN = 'http://127.0.0.1:4173';
const AGENT_PLUGIN = 'org.dxos.plugin.agent';

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

/** The workspace segment of a pair-chain URL (`/w/<workspace>/…`). */
const workspaceOf = (page) => {
  const [anchor, workspace] = new URL(page.url()).pathname.split('/').filter(Boolean);
  return anchor === 'w' ? workspace : undefined;
};

const currentWorkspace = (page) => page.getByTestId('navtree.workspace.visible');

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

/** The plank showing a chat: only a chat surface has a thread. */
const chatPlank = (page) =>
  page
    .getByTestId('deck.plank')
    .filter({ has: page.getByTestId('assistant.thread') })
    .first();

/** The thread's messages as text, one entry per rendered message or activity row. */
const messages = async (page) =>
  chatPlank(page)
    .getByTestId('assistant.thread')
    .locator('.cm-content')
    .allInnerTexts()
    .catch(() => []);

/** A row that is still the agent at work rather than its answer. */
const BUSY = /^(Thinking|Ran \d+ commands?|Running|Starting)/;

/** Waits for the agent to answer after `prompt`: a non-activity message past it that stays put for a few seconds. */
const waitForAnswer = async (page, prompt, { what, match }) => {
  let last;
  let stableSince = 0;
  await waitFor(
    async () => {
      const all = await messages(page);
      const after = all.slice(all.lastIndexOf(prompt) + 1);
      const answer = after.filter((text) => !BUSY.test(text.trim())).at(-1);
      if (all.lastIndexOf(prompt) < 0 || !answer || (match && !after.some((text) => match.test(text)))) {
        return false;
      }
      if (answer !== last) {
        last = answer;
        stableSince = Date.now();
        return false;
      }
      return Date.now() - stableSince > 4_000;
    },
    { timeout: TURN_TIMEOUT, what },
  );
  return last;
};

/** Types into the chat prompt a character at a time and submits it. */
const ask = async (peer, text) => {
  const prompt = chatPlank(peer.page).getByTestId('assistant.prompt').locator('.cm-content');
  await peer.click(prompt);
  await peer.type(text, { delay: 30 });
  await waitFor(async () => (await prompt.innerText()).includes(text), { what: 'the prompt to hold the text' });
  await peer.page.keyboard.press('Enter');
};

/** Opens the space's only agent from the navtree's Agents section; its article is the viewer's private chat. */
const openAgent = async (peer) => {
  const { page } = peer;
  const workspace = currentWorkspace(page);
  const section = workspace.getByTestId('treeItem.heading').filter({ hasText: 'Agents' }).first();
  await section.waitFor({ timeout: TIMEOUT });
  const agent = workspace.getByTestId('treeItem.heading').filter({ hasText: 'New agent' }).first();
  if (!(await agent.isVisible().catch(() => false))) {
    await peer.click(section);
  }
  await peer.click(agent);
  await chatPlank(page).getByTestId('assistant.prompt').waitFor({ timeout: 90_000 });
};

export const steps = [
  {
    name: 'Both people boot with their own identity, the agent plugin and a name',
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
        // Facts and private chats name a member by the display name they signed with.
        await page.evaluate(
          (name) => globalThis.composer.invoke('org.dxos.operation.client.updateProfile', { displayName: name }),
          displayName,
        );
        // Back to the personal space through the rail; a reload would restore the registry workspace.
        await page.getByTestId('spacePlugin.space').first().click();
        await page.getByTestId('deck.plank').first().waitFor({ timeout: TIMEOUT });
      }
      await peers.alice.page.waitForTimeout(2_000);
      await Promise.all([clearChrome(peers.alice), clearChrome(peers.bob)]);
      // Off the companion button, whose tooltip would otherwise open the take.
      await Promise.all([peers.alice.page.mouse.move(500, 500), peers.bob.page.mouse.move(500, 500)]);
      const identities = await Promise.all(
        [peers.alice, peers.bob].map(({ page }) =>
          page.evaluate(() => {
            const identity = globalThis.dxos?.client?.halo.identity.get();
            return { key: identity?.did ?? '', name: identity?.profile?.displayName };
          }),
        ),
      );
      if (!identities[0].key || identities[0].key === identities[1].key) {
        throw new Error(`expected two distinct identities, got ${JSON.stringify(identities)}`);
      }
      if (identities[0].name !== 'Alice' || identities[1].name !== 'Bob') {
        throw new Error(`display names not set: ${JSON.stringify(identities)}`);
      }
    },
  },
  {
    name: 'Alice creates a space and an agent',
    subtitle: 'QA-3 step 1',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(page.getByTestId('spacePlugin.addSpace'));
      await alice.click(page.getByTestId('spacePlugin.createSpace'));
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await alice.click(page.getByTestId('create-space-form').getByTestId('name'));
      await alice.type(SPACE);
      await alice.click(save);
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await page.getByText(SPACE).first().waitFor({ timeout: TIMEOUT });

      await alice.click(currentWorkspace(page).getByTestId('spacePlugin.createObject').first());
      await alice.click(page.getByTestId('create-object-form.type.org.dxos.type.agent'));
      await currentWorkspace(page)
        .getByTestId('treeItem.heading')
        .filter({ hasText: 'New agent' })
        .first()
        .waitFor({ timeout: TIMEOUT });
      await chatPlank(page).getByTestId('assistant.prompt').waitFor({ timeout: 90_000 });
      await clearChrome(alice);
    },
  },
  {
    name: 'Alice invites Bob; Bob joins with the code',
    subtitle: 'QA-3 step 2',
    run: async ({ peers: { alice, bob } }) => {
      const sharedWorkspace = workspaceOf(alice.page);
      await expandRow(alice, currentWorkspace(alice.page).getByTestId('spacePlugin.settings').first());
      await alice.click(
        currentWorkspace(alice.page).getByTestId('spacePlugin.members').first().getByTestId('treeItem.heading').first(),
      );
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

      await waitFor(() => workspaceOf(bob.page) === sharedWorkspace, { what: "Bob to reach Alice's space" });
      await currentWorkspace(bob.page)
        .getByTestId('treeItem.heading')
        .filter({ hasText: 'Agents' })
        .first()
        .waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Each opens a private chat with the agent',
    subtitle: 'QA-3 step 3',
    run: async ({ peers: { alice, bob } }) => {
      await openAgent(alice);
      await clearChrome(alice);
      await openAgent(bob);
      await clearChrome(bob);
      // Each chat is the member's own: Bob's starts empty, whatever Alice's holds.
      if ((await messages(bob.page)).length > 0) {
        throw new Error("Bob's private chat is not empty");
      }
    },
  },
  {
    name: 'Alice asks the agent to keep her posted on Bob',
    subtitle: `QA-3 step 4: "${ALICE_ASKS}"`,
    run: async ({ peers: { alice } }) => {
      await ask(alice, ALICE_ASKS);
      await waitForAnswer(alice.page, ALICE_ASKS, { what: "the agent's answer to Alice" });
    },
  },
  {
    name: 'Bob tells the agent what he is working on',
    subtitle: `QA-3 step 5: "${BOB_SAYS}"`,
    run: async ({ peers: { bob } }) => {
      await ask(bob, BOB_SAYS);
      await waitForAnswer(bob.page, BOB_SAYS, { what: "the agent's answer to Bob" });
    },
  },
  {
    name: "Alice's chat receives the update — she sent nothing",
    subtitle: 'QA-3 step 6: the watch wakes and the agent tells Alice',
    run: async ({ peers: { alice } }) => {
      await waitForAnswer(alice.page, ALICE_ASKS, {
        what: 'the update about Bob in Alice’s chat',
        match: UPDATE_PATTERN,
      });
    },
  },
  {
    name: "Alice opens the agent's Brain: the goal it keeps for her",
    subtitle: 'QA-3 step 7: Brain companion, Goals tab',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(chatPlank(page).getByTestId('plankHeading.companion'));
      await alice.click(page.getByTestId('deck.companion.tab.brain'));
      await alice.click(page.getByTestId('agent-knowledge-tab-goals'));
      await page.getByTestId('agent-knowledge-goal').first().waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: "The Brain's Facts tab: what the agent read from both chats",
    subtitle: 'QA-3 step 8: facts live only in the brain',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(page.getByTestId('agent-knowledge-tab-facts'));
      // The tab polls the brain every 3 s; give EDGE's brain a few reads.
      await page.getByTestId('agent-knowledge-fact').first().waitFor({ timeout: 30_000 });
    },
  },
];

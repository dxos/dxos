//
// Copyright 2026 DXOS.org
//

/**
 * An agent's admins are the members of its own space. Alice creates Kai, finds it in Profile › Agents, and
 * invites Bob into Kai's space from its Members panel; Bob joins with the code and finds Kai in his own Agents
 * panel, and Alice's panel now lists Bob beside her — recorded side by side, one browser per person.
 *
 * @mdl packages/plugins/plugin-agent/PLUGIN.mdl test QA-5
 * @app composer-app dev server on 127.0.0.1:4173 against a local EDGE with brain identities (dxos/edge#1293):
 *
 *   DX_EDGE_BASE_URL=http://localhost:8787 DX_STRICT=false DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true \
 *     moon run composer-app:serve -- --port 4173 --host 127.0.0.1
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/plugins/plugin-agent/autocue/agent-admins.mjs --out /tmp/pair --mp4 on
 *
 * Setup and the invitation follow `two-people-one-agent.mjs`. Keep the file free of imports, since it is loaded
 * from outside the workspace.
 */

const AGENT = 'Kai';
const TIMEOUT = 60_000;
/** Creating an agent provisions its identity and space on EDGE before the space reaches the client. */
const PROVISION_TIMEOUT = 120_000;
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

/** Kai's row in the account's Agents panel. */
const agentRow = (page) => page.getByTestId('agent-list.item').filter({ hasText: AGENT }).first();

/** Opens the profile from the rail, then its Agents panel, and waits for Kai's row to name `admins`. */
const openAgentsPanel = async (peer, admins) => {
  const { page } = peer;
  if (workspaceOf(page) !== 'dxos:account') {
    await peer.click(page.getByTestId('clientPlugin.account').first());
  }
  await peer.click(page.getByTestId('agentPlugin.agents').first());
  await waitFor(
    async () =>
      (
        (await agentRow(page)
          .innerText()
          .catch(() => '')) ?? ''
      ).includes(admins),
    {
      what: `Kai's row to list "${admins}"`,
    },
  );
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
    name: `Alice creates an agent named ${AGENT}`,
    subtitle: 'QA-5 step 1: its identity and its own space are minted on EDGE',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(currentWorkspace(page).getByTestId('spacePlugin.createObject').first());
      await alice.click(page.getByTestId('create-object-form.type.org.dxos.type.agent'));
      const name = page.locator('[role="dialog"] input').first();
      await alice.click(name);
      await alice.type(AGENT);
      await alice.click(page.locator('[role="dialog"] [data-testid="save-button"]'));
      await currentWorkspace(page)
        .getByTestId('treeItem.heading')
        .filter({ hasText: AGENT })
        .first()
        .waitFor({ timeout: TIMEOUT });
      // The membership EDGE returns, written to Alice's HALO, brings Kai's space into her space list.
      await spaceTab(page, AGENT).waitFor({ timeout: PROVISION_TIMEOUT });
      await clearChrome(alice);
    },
  },
  {
    name: `Alice opens Profile › Agents: ${AGENT}, with her as its admin`,
    subtitle: 'QA-5 step 2: the agents she administers, read from her own spaces',
    run: async ({ peers: { alice } }) => {
      await openAgentsPanel(alice, 'Alice (you)');
    },
  },
  {
    name: `Alice invites Bob into ${AGENT}'s space`,
    subtitle: 'QA-5 step 3: Open space, then Settings › Members',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(agentRow(page).getByTestId('agent-list.open'));
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
      await expandRow(alice, currentWorkspace(page).getByTestId('spacePlugin.settings').first());
      await alice.click(
        currentWorkspace(page).getByTestId('spacePlugin.members').first().getByTestId('treeItem.heading').first(),
      );
    },
  },
  {
    name: `Bob joins ${AGENT}'s space with the code and the PIN`,
    subtitle: 'QA-5 step 4: an ordinary space invitation',
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
    name: `Bob opens Profile › Agents: ${AGENT}, administered by Alice and him`,
    subtitle: 'QA-5 step 5: a member of the space is an admin of the agent',
    run: async ({ peers: { bob } }) => {
      await openAgentsPanel(bob, 'Bob (you)');
      await waitFor(async () => (await agentRow(bob.page).innerText()).includes('Alice'), {
        what: "Bob's row to list Alice",
      });
    },
  },
  {
    name: `Alice's Agents panel now lists Bob among ${AGENT}'s admins`,
    subtitle: 'QA-5 step 6',
    narration:
      "Each browser lists Kai from its own replica of Kai's space, kept in sync through EDGE: being Kai's admin is being a member of that space.",
    run: async ({ peers: { alice } }) => {
      await openAgentsPanel(alice, 'Alice (you), Bob');
      await alice.page.waitForTimeout(10_000);
    },
  },
];

//
// Copyright 2026 DXOS.org
//

/**
 * Alice and Bob share a space and see each other's pointer on a tldraw sketch and on an architecture diagram (the
 * svg variant), recorded side by side.
 *
 * @mdl packages/plugins/plugin-illustrator/PLUGIN.mdl test QA-5
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE signaling)
 *
 * A flow for `pair.mjs`, built and served as `two-peer-collaboration.mjs` describes:
 *
 *   node .agents/skills/autocue/scripts/pair.mjs \
 *     --flow packages/apps/composer-app/autocue/drawing-cursors.mjs --out /tmp/pair
 *
 * Selectors are the ones `composer-e2e`'s `drawing-cursors.spec.ts` uses; keep the file free of imports, since it
 * is loaded from outside the workspace.
 */

const SPACE = 'Design Review';
const TIMEOUT = 60_000;

const workspaceOf = (page) => {
  const [anchor, workspace] = new URL(page.url()).pathname.split('/').filter(Boolean);
  return anchor === 'w' ? workspace : undefined;
};

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

const currentWorkspace = (page) => page.getByTestId('navtree.workspace.visible');

const plank = (page) => page.getByTestId('deck.plank').first();

const SURFACE_TEST_IDS = { svg: 'illustrator.svg', tldraw: 'canvas' };

const surface = (page, variant) => plank(page).getByTestId(SURFACE_TEST_IDS[variant]).first();

/** The diagram Alice draws into the svg drawing: how this demo's cursors reach the other peer. */
const DIAGRAM = `diagram flow=right
node Pointer "pointer move"
node Hook "usePointerCursors"
node Channel "Awareness.Channel"
node Gossip "space gossip"
node Peer "other peer"
edge Pointer -> Hook "world point"
edge Hook -> Channel "update"
edge Channel -> Gossip "throttled post"
edge Gossip -> Peer "RemoteCursor"`;

/** Draws `source` into the drawing open in Alice's plank, through the illustrator's draw operation. */
const drawDiagram = async ({ page }, source) => {
  const objectId = new URL(page.url()).pathname.split('/').filter(Boolean).at(-1);
  await page.evaluate(
    async ({ objectId, source }) => {
      const errors = [];
      for (const space of globalThis.dxos?.spaces?.() ?? []) {
        try {
          const drawing = space.db.makeRef(`echo:///${objectId}`);
          await globalThis.composer.invoke(
            'org.dxos.operation.illustrator.draw',
            { drawing, source },
            { spaceId: space.id },
          );
          return;
        } catch (err) {
          errors.push(String(err));
        }
      }
      throw new Error(`could not draw the diagram: ${errors.join('; ')}`);
    },
    { objectId, source },
  );
};

const remoteCursors = (page) => plank(page).getByTestId('remote-cursor');

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

const createDrawing = async (peer, variant) => {
  const { page } = peer;
  await peer.click(currentWorkspace(page).getByTestId('spacePlugin.createObject').first());
  await peer.click(page.getByTestId('create-object-form.type.org.dxos.type.drawing'));
  const search = page.getByTestId('create-drawing-panel.variant-input');
  await peer.click(search);
  await peer.type(variant);
  const dialog = page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
  // The variant search is fuzzy, so pick the row whose label is exactly the variant.
  await peer.click(
    dialog
      .locator('[data-value]')
      .filter({ hasText: new RegExp(`^${variant}$`) })
      .first(),
  );
  await peer.click(dialog.getByTestId('save-button'));
  await waitFor(async () => (await dialog.count()) === 0, { what: 'the create dialog to close' });
  await surface(page, variant).waitFor({ timeout: TIMEOUT });
  // An opened object brings its companion; both peers need the same viewport to share a view of the drawing.
  await clearChrome(peer);
};

const openDrawing = async (peer, nth, variant) => {
  await expandRow(peer, currentWorkspace(peer.page).getByTestId('spacePlugin.collectionsSection').first());
  const link = currentWorkspace(peer.page).getByTestId('spacePlugin.object').nth(nth);
  await link.waitFor({ timeout: TIMEOUT });
  await peer.click(link);
  await surface(peer.page, variant).waitFor({ timeout: TIMEOUT });
  await clearChrome(peer);
};

/** Traces a loop over the surface, the way someone points at things while talking. */
const wander = async (peer, variant, { from = 0.3, to = 0.7 } = {}) => {
  const box = await surface(peer.page, variant).boundingBox();
  if (!box) {
    throw new Error('the drawing surface is not laid out');
  }
  const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
  for (const [fx, fy] of [
    [from, from],
    [to, from],
    [to, to],
    [from, to],
    [0.5, 0.5],
  ]) {
    const [x, y] = at(fx, fy);
    await peer.move({ x, y }, { steps: 25 });
  }
};

const seesCursor = async (peer) => (await remoteCursors(peer.page).count()) > 0;

/** Moves until the other peer has the pointer: a post sent before the peers connect is lost. */
const wanderUntilSeen = async (peer, other, variant, range) => {
  const deadline = Date.now() + TIMEOUT;
  do {
    await wander(peer, variant, range);
    if (await seesCursor(other)) {
      return;
    }
  } while (Date.now() < deadline);
  throw new Error(`${other.name} never saw ${peer.name}'s pointer`);
};

export const steps = [
  {
    name: 'Both peers boot with their own identity',
    setup: true,
    run: async ({ peers }) => {
      await peers.alice.page.waitForTimeout(3_000);
      await Promise.all([clearChrome(peers.alice), clearChrome(peers.bob)]);
    },
  },
  {
    name: `Alice creates "${SPACE}" and invites Bob`,
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
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

      await expandRow(alice, currentWorkspace(page).getByTestId('spacePlugin.settings').first());
      await alice.click(
        currentWorkspace(page).getByTestId('spacePlugin.members').first().getByTestId('treeItem.heading').first(),
      );
      const invitationCode = alice.nextConsoleValue('invitationCode');
      const authCode = alice.nextConsoleValue('authCode');
      await alice.click(page.getByTestId('membersContainer.createInvitation.more'));
      await alice.click(page.getByTestId('membersContainer.inviteOne'));
      await alice.click(page.getByTestId('membersContainer.createInvitation'));

      await bob.click(bob.page.getByTestId('spacePlugin.addSpace'));
      await bob.click(bob.page.getByTestId('spacePlugin.joinSpace'));
      const input = bob.page.getByTestId('space-invitation-input');
      await bob.click(input);
      await input.fill(await invitationCode);
      await bob.page.keyboard.press('Enter');
      const pin = bob.page.locator("[data-testid='space-auth-code-input']:visible");
      await pin.waitFor({ timeout: TIMEOUT });
      await bob.click(pin.locator('input').first());
      await bob.type(await authCode, { delay: 60 });
      await bob.click(bob.page.getByTestId('space-invitation-authenticator-next'));
      // Alice's URL can still be settling after the space is created, so compare against it live.
      await waitFor(() => workspaceOf(bob.page) !== undefined && workspaceOf(bob.page) === workspaceOf(page), {
        what: "Bob to reach Alice's space",
      });
      await clearChrome(bob);
    },
  },
  {
    name: 'Alice opens a tldraw sketch; Bob opens it too',
    subtitle: 'QA-5 step 1',
    run: async ({ peers: { alice, bob } }) => {
      await createDrawing(alice, 'tldraw');
      await openDrawing(bob, 0, 'tldraw');
    },
  },
  {
    name: 'Alice points around the sketch; Bob sees her cursor in her colour',
    subtitle: 'QA-5 step 2',
    run: async ({ peers: { alice, bob } }) => {
      await wanderUntilSeen(alice, bob, 'tldraw');
      await wander(alice, 'tldraw');
    },
  },
  {
    name: 'Bob points back; Alice sees his',
    subtitle: 'QA-5 step 3',
    run: async ({ peers: { alice, bob } }) => {
      await wanderUntilSeen(bob, alice, 'tldraw', { from: 0.4, to: 0.8 });
      await wander(bob, 'tldraw', { from: 0.4, to: 0.8 });
    },
  },
  {
    name: "Alice moves off the sketch; her cursor leaves Bob's",
    subtitle: 'QA-5 step 4',
    run: async ({ peers: { alice, bob } }) => {
      await alice.move({ x: 4, y: 4 });
      await waitFor(async () => !(await seesCursor(bob)), { what: "Alice's cursor to leave Bob's sketch" });
    },
  },
  {
    name: 'The same on an architecture diagram',
    subtitle: 'QA-5 step 5',
    run: async ({ peers: { alice, bob } }) => {
      await createDrawing(alice, 'svg');
      await drawDiagram(alice, DIAGRAM);
      await openDrawing(bob, 1, 'svg');
      await wanderUntilSeen(alice, bob, 'svg');
      await wanderUntilSeen(bob, alice, 'svg', { from: 0.4, to: 0.8 });
      await wander(alice, 'svg');
    },
  },
];

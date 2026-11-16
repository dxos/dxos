//
// Copyright 2026 DXOS.org
//

/**
 * Alice shares a space from Composer, Bob joins it in the diagram app, and the two draw on one diagram and
 * follow each other between the apps. Recorded side by side.
 *
 * @title Across this app and Composer
 * @mdl packages/apps/diagram-app/spec/APP.mdl test QA-8
 * @app composer-app `bundle-e2e` on 127.0.0.1:4173 and diagram-app `bundle-e2e` on 127.0.0.1:9008, both on EDGE preview
 *
 * A flow for `pair.mjs`: every step receives both peers. Alice boots Composer at `--url`; Bob's first visit is the
 * invitation link, opened in the diagram app. Built and served:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run diagram-app:bundle-e2e
 *   (cd packages/apps/composer-app && pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort)
 *   (cd packages/apps/diagram-app && pnpm exec vite preview --host 127.0.0.1 --port 9008 --strictPort)
 *   node .agents/skills/autocue/scripts/pair.mjs --flow packages/apps/diagram-app/autocue/across-apps.mjs \
 *     --url http://127.0.0.1:4173 --out /tmp/across
 *
 * Keep the file free of imports, since it is loaded from outside the workspace.
 */

const DIAGRAM_APP = 'http://127.0.0.1:9008';
const SPACE = 'Design review';
const DIAGRAM = 'System map';
const NOTES = 'Notes';
const TIMEOUT = 90_000;

/** Bob's first visit is the invitation link, so only Alice boots before the take. */
export const boot = ['alice'];

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

// Composer.
const currentWorkspace = (page) => page.getByTestId('navtree.workspace.visible');
const objectLink = (page, name) =>
  currentWorkspace(page).getByTestId('spacePlugin.object').filter({ hasText: name }).first();
const plank = (page) => page.getByTestId('deck.plank').first();
const dialog = (page) => page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
const sidebar = (page) => page.locator('[data-scope="main"][data-part="complementary-sidebar"]');

// Both apps: the 2D view and its shapes.
const sceneView = (page) => page.getByTestId('scene-view').first();
const nodes = (page) => sceneView(page).locator('[data-node-id]');

/** Where the first shape sits in the view: its centre's offset from the view's centre, and its width. */
const shapeInView = async (page) => {
  const view = await sceneView(page).boundingBox();
  const shape = await nodes(page).first().boundingBox();
  return view && shape
    ? {
        dx: shape.x + shape.width / 2 - (view.x + view.width / 2),
        dy: shape.y + shape.height / 2 - (view.y + view.height / 2),
        width: shape.width,
      }
    : undefined;
};

/** Two views show the scene alike when the same shape sits at the same offset from their centres, at the same size. */
const sameView = async (a, b) => {
  const [one, two] = await Promise.all([shapeInView(a), shapeInView(b)]);
  return (
    !!one &&
    !!two &&
    Math.abs(one.dx - two.dx) < 3 &&
    Math.abs(one.dy - two.dy) < 3 &&
    Math.abs(one.width - two.width) < 3
  );
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

/** Renames the object the navtree lists as `from` through its row's actions. */
const rename = async (page, from, to) => {
  const row = objectLink(page, from);
  await row.waitFor({ timeout: TIMEOUT });
  await row.hover();
  await row
    .getByTestId(/navtree\.treeItem\.actionsLevel\d+/)
    .first()
    .click();
  await page.getByTestId('spacePlugin.renameObject').last().click();
  const popover = page.locator('[data-scope="popover"][data-part="content"]');
  const field = popover.getByRole('textbox', { name: 'Name' });
  await field.fill(to);
  await field.press('Escape');
  for (let attempt = 0; attempt < 5 && (await popover.isVisible().catch(() => false)); attempt++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  await objectLink(page, to).waitFor({ timeout: TIMEOUT });
};

/** Creates an object of `type` in the current space from the navtree's +, choosing `option` when a picker asks. */
const createObject = async (page, type, option) => {
  await currentWorkspace(page).getByTestId('spacePlugin.createObject').first().click();
  await page.getByTestId(`create-object-form.type.${type}`).click();
  if (option) {
    await dialog(page).getByRole('option', { name: option, exact: true }).click();
    await dialog(page).getByTestId('save-button').click();
  }
  await dialog(page).waitFor({ state: 'detached', timeout: TIMEOUT });
};

/** Drags out a shape with a toolbar tool, the cursor following the drag. */
const draw = async (peer, tool, from, to) => {
  await peer.click(peer.page.getByTestId(`canvas.tool.${tool}`).first());
  await peer.move(from, { steps: 10 });
  await peer.page.mouse.down();
  await peer.move(to, { steps: 20 });
  await peer.page.mouse.up();
  await peer.click(peer.page.getByTestId('canvas.tool.select').first());
  await sceneView(peer.page).focus();
  await peer.page.keyboard.press('Escape');
};

/**
 * Zooms about `at` with Ctrl and the wheel, in for a negative `zoom` and out for a positive one (four ticks of 25 come to
 * about 1.8x), then scrolls the canvas by `pan`, the cursor resting on the view.
 */
const zoomAndPan = async (peer, at, pan, zoom = -25) => {
  await peer.move(at, { steps: 10 });
  for (let i = 0; i < 4; i++) {
    await peer.page.keyboard.down('Control');
    await peer.page.mouse.wheel(0, zoom);
    await peer.page.keyboard.up('Control');
    await peer.page.waitForTimeout(120);
  }
  for (let i = 0; i < 5; i++) {
    await peer.page.mouse.wheel(pan.x / 5, pan.y / 5);
    await peer.page.waitForTimeout(80);
  }
};

/** The centre of a peer's 2D view, offset by `dx`, `dy`. */
const inView = async (page, dx = 0, dy = 0) => {
  const box = await sceneView(page).boundingBox();
  return { x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 + dy };
};

const setName = (page, displayName) =>
  page.evaluate(
    (displayName) => globalThis.composer?.invoke?.('org.dxos.operation.client.updateProfile', { displayName }),
    displayName,
  );

let link;

export const steps = [
  {
    name: `Alice makes "${SPACE}" in Composer, with a diagram and a document`,
    setup: true,
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await page.waitForTimeout(3_000);
      await clearChrome(alice);
      await setName(page, 'Alice');
      await page.getByTestId('spacePlugin.addSpace').click();
      await page.getByTestId('spacePlugin.createSpace').click();
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await save.click();
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await currentWorkspace(page).getByText(SPACE).first().waitFor({ timeout: TIMEOUT });

      await createObject(page, 'org.dxos.type.document');
      await rename(page, 'New document', NOTES);
      await createObject(page, 'org.dxos.type.drawing', 'Canvas');
      await rename(page, 'New drawing', DIAGRAM);
      await objectLink(page, DIAGRAM).click();
      await plank(page).getByTestId('canvas-toolbar').waitFor({ timeout: TIMEOUT });
      await clearChrome(alice);

      // The copy button writes to the clipboard, which a headless page cannot read back.
      await page.evaluate(() => {
        Object.defineProperty(navigator.clipboard, 'writeText', {
          configurable: true,
          value: async (text) => {
            window.__copied = text;
          },
        });
      });
    },
  },
  {
    name: 'Alice shares the space from Composer and copies the link',
    subtitle: 'QA-8 step 1',
    run: async ({ peers: { alice }, sleep }) => {
      const { page } = alice;
      const settings = currentWorkspace(page).getByTestId('spacePlugin.settings').first();
      const caret = settings.locator('[data-part="branch-trigger"]').first();
      if ((await caret.getAttribute('data-state')) !== 'open') {
        await alice.click(caret);
      }
      await alice.click(
        currentWorkspace(page).getByTestId('spacePlugin.members').first().getByTestId('treeItem.heading').first(),
      );
      await alice.click(page.getByTestId('membersContainer.createInvitation').first());
      await alice.click(page.getByTestId('copy-invitation').first());
      const copied = await page.evaluate(() => window.__copied);
      if (!copied?.includes('spaceInvitationCode=')) {
        throw new Error(`the copy button copied no invitation link: ${copied}`);
      }
      // The same code opens the space in either app; Bob's link names the diagram app.
      const url = new URL(copied);
      link = `${DIAGRAM_APP}/?spaceInvitationCode=${url.searchParams.get('spaceInvitationCode')}`;
      await sleep(1_500);
      await alice.click(objectLink(page, DIAGRAM));
      await plank(page).getByTestId('canvas-toolbar').waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Bob opens the link in the diagram app and lands on the diagram',
    subtitle: 'QA-8 step 2',
    run: async ({ peers: { bob } }) => {
      await bob.page.goto(link);
      await bob.page.getByTestId('canvas-toolbar').waitFor({ timeout: TIMEOUT });
      await waitFor(async () => (await bob.page.getByTestId('diagram-app.pill').innerText()).includes(DIAGRAM), {
        what: `Bob's pill on "${DIAGRAM}"`,
      });
      await setName(bob.page, 'Bob');
    },
  },
  {
    name: 'They draw together: a rectangle in Composer, an ellipse in the diagram app',
    subtitle: 'QA-8 step 3',
    run: async ({ peers: { alice, bob } }) => {
      await draw(alice, 'node:rect', await inView(alice.page, -90, -40), await inView(alice.page, 30, 40));
      await waitFor(async () => (await nodes(bob.page).count()) === 1, { what: "Alice's rectangle on Bob's canvas" });
      await draw(bob, 'node:ellipse', await inView(bob.page, 60, 80), await inView(bob.page, 170, 160));
      await waitFor(async () => (await nodes(alice.page).count()) === 2, { what: "Bob's ellipse on Alice's canvas" });
      await waitFor(async () => (await bob.page.getByTestId('spacePlugin.presence.member').count()) > 0, {
        what: "Alice's avatar beside Bob's Share",
      });
      await waitFor(async () => (await plank(alice.page).getByTestId('spacePlugin.presence.member').count()) > 0, {
        what: "Bob's avatar on Alice's plank",
      });
    },
  },
  {
    name: 'Bob follows Alice; her pans and zooms in Composer move his view',
    subtitle: 'QA-8 step 4',
    run: async ({ peers: { alice, bob } }) => {
      await bob.click(bob.page.getByTestId('spacePlugin.presence.member').first());
      await bob.click(bob.page.getByTestId('spacePlugin.presence.follow').first());
      await waitFor(
        async () => (await bob.page.getByTestId('diagram-app.pill').getAttribute('data-accent')) === 'amber',
        {
          what: "Bob's pill to take the follow's accent",
        },
      );
      await zoomAndPan(alice, await inView(alice.page, -20, 0), { x: 120, y: 60 });
      await waitFor(() => sameView(alice.page, bob.page), { timeout: 10_000, what: "Bob's view to match Alice's" });
    },
  },
  {
    name: 'Alice opens a document; Bob stays on the diagram and his follow pauses',
    subtitle: 'QA-8 step 5',
    run: async ({ peers: { alice, bob }, sleep }) => {
      await alice.click(objectLink(alice.page, NOTES));
      await plank(alice.page).getByTestId('composer.markdownRoot').waitFor({ timeout: TIMEOUT });
      await bob.click(bob.page.getByTestId('spacePlugin.presence.member').first());
      const stop = bob.page.getByTestId('spacePlugin.presence.stopFollowing');
      await stop.waitFor({ timeout: TIMEOUT });
      await waitFor(async () => (await stop.locator('..').innerText()).includes('Paused'), {
        timeout: 15_000,
        what: "Paused on Bob's row for Alice",
      });
      await sleep(2_000);
      await bob.click(stop);
    },
  },
  {
    name: 'Alice follows Bob from her diagram plank; his pans and zooms move her view',
    subtitle: 'QA-8 step 6',
    run: async ({ peers: { alice, bob } }) => {
      await alice.click(objectLink(alice.page, DIAGRAM));
      await plank(alice.page).getByTestId('canvas-toolbar').waitFor({ timeout: TIMEOUT });
      const avatar = plank(alice.page).getByTestId('spacePlugin.presence.member').first();
      await avatar.waitFor({ timeout: TIMEOUT });
      await alice.click(avatar);
      await alice.click(alice.page.getByTestId('spacePlugin.presence.follow').first());
      await zoomAndPan(bob, await inView(bob.page, 40, 20), { x: -160, y: 40 }, 25);
      await waitFor(() => sameView(bob.page, alice.page), { timeout: 10_000, what: "Alice's view to match Bob's" });
    },
  },
  {
    name: 'One space, two apps, peer to peer',
    run: async ({ sleep }) => {
      await sleep(3_000);
    },
  },
];

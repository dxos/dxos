//
// Copyright 2026 DXOS.org
//

/**
 * Ben follows Ada from her avatar: his view goes where hers does, through a zoom, a pan and a switch of diagram,
 * until he stops. Recorded side by side.
 *
 * @title Follow a collaborator
 * @mdl packages/apps/diagram-app/spec/APP.mdl test QA-7
 * @app diagram-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:9008 (EDGE preview signaling)
 *
 * A flow for `pair.mjs`: every step receives both peers. Built and served from `packages/apps/diagram-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run diagram-app:bundle-e2e
 *   pnpm exec vite preview --host 127.0.0.1 --port 9008 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs --flow packages/apps/diagram-app/autocue/follow-a-collaborator.mjs \
 *     --url http://127.0.0.1:9008 --peers Ada,Ben --ready '[data-testid="canvas-toolbar"]' --out /tmp/follow
 *
 * Selectors are the ones `collaboration.spec.ts` uses; keep the file free of imports, since it is loaded from
 * outside the workspace.
 */

const TIMEOUT = 90_000;

/** Ben's first visit is the invitation link, so only Ada boots before the take. */
export const boot = ['ada'];

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

const path = (page) => new URL(page.url()).pathname;

const pill = (page) => page.getByTestId('diagram-app.pill');

const accent = (page) => pill(page).getAttribute('data-accent');

const presence = (page) => page.getByTestId('spacePlugin.presence.member');

/** Where the first shape sits relative to the view's centre, and its width. */
const shapeInView = async (page) => {
  const scene = page.getByTestId('diagram-app').getByTestId('scene-view');
  const view = await scene.boundingBox();
  const shape = await scene.locator('[data-node-id]').first().boundingBox();
  if (!view || !shape) {
    return undefined;
  }
  return {
    dx: shape.x + shape.width / 2 - (view.x + view.width / 2),
    dy: shape.y + shape.height / 2 - (view.y + view.height / 2),
    width: shape.width,
  };
};

const sameView = (a, b) =>
  !!a && !!b && Math.abs(a.dx - b.dx) < 4 && Math.abs(a.dy - b.dy) < 4 && Math.abs(a.width - b.width) < 4;

/** Presses a canvas shortcut; the scene takes keys only while it has focus, not the toolbar button last clicked. */
const sceneKey = async (peer, key) => {
  await peer.page.getByTestId('scene-view').focus();
  await peer.page.keyboard.press(key);
};

/** Drags out a shape with a toolbar tool, the cursor following the drag, clear of the panel on the right. */
const draw = async (peer, tool, from, to) => {
  await peer.click(peer.page.getByTestId(`canvas.tool.${tool}`));
  await peer.move(from, { steps: 10 });
  await peer.page.mouse.down();
  await peer.move(to, { steps: 20 });
  await peer.page.mouse.up();
  await peer.click(peer.page.getByTestId('canvas.tool.select'));
  await sceneKey(peer, 'Escape');
};

/** Zooms in with Ctrl and the wheel at `at`, then scrolls the canvas by `pan`. */
const zoomAndPan = async (peer, at, pan, sleep) => {
  await peer.move(at, { steps: 10 });
  await peer.page.keyboard.down('Control');
  for (let i = 0; i < 4; i++) {
    await peer.page.mouse.wheel(0, -120);
    await sleep(150);
  }
  await peer.page.keyboard.up('Control');
  await sleep(400);
  await peer.page.mouse.wheel(pan.x, pan.y);
};

const openDiagram = async (peer, name, sleep) => {
  await peer.click(peer.page.getByTestId('diagram-app.diagram-menu'));
  await peer.page.getByTestId('diagram-app.diagram-list.find').waitFor();
  await sleep(800);
  const entry = peer.page
    .getByTestId('diagram-app.diagram-list')
    .locator('[data-testid^="diagram-app.diagram."]:not([data-testid$=".actions"])')
    .filter({ hasText: name });
  await peer.click(entry.first());
};

export const steps = [
  {
    name: 'Ada and Ben share a space',
    setup: true,
    run: async ({ peers: { ada, ben } }) => {
      // The copy button writes to the clipboard, which a headless page cannot read back.
      await ada.page.evaluate(() => {
        Object.defineProperty(navigator.clipboard, 'writeText', {
          configurable: true,
          value: async (text) => {
            window.__copied = text;
          },
        });
      });
      await draw(ada, 'node:rect', { x: 450, y: 250 }, { x: 650, y: 400 });
      await ada.page.getByTestId('diagram-app.share').click();
      const dialog = ada.page.getByTestId('diagram-app.share-dialog');
      await dialog.getByTestId('membersContainer.createInvitation').click();
      await dialog.getByTestId('copy-invitation').click();
      const link = await ada.page.evaluate(() => window.__copied);
      if (!link?.includes('spaceInvitationCode=')) {
        throw new Error(`the copy button copied no invitation link: ${link}`);
      }
      await ada.page.keyboard.press('Escape');
      await ben.page.goto(link);
      await ben.page.getByTestId('canvas-toolbar').waitFor({ timeout: TIMEOUT });
      for (const peer of [ada, ben]) {
        await waitFor(async () => (await presence(peer.page).count()) === 1, { what: `${peer.name} seeing the other` });
      }
      await ada.page.getByTestId('diagram-app.diagram-menu').click();
      await ada.page.getByTestId('diagram-app.diagram-list.find').waitFor();
      await ada.page.keyboard.type('Roadmap');
      await ada.page.getByTestId('diagram-app.new-diagram').click();
      await waitFor(async () => (await pill(ada.page).innerText()).includes('Roadmap'), { what: 'Ada on Roadmap' });
      await draw(ada, 'node:rect', { x: 500, y: 300 }, { x: 640, y: 400 });
      for (const peer of [ada, ben]) {
        await peer.page.mouse.move(700, 600);
      }
    },
  },
  {
    name: 'Ben follows Ada from her avatar',
    subtitle: 'QA-7 step 2',
    run: async ({ peers: { ada, ben }, sleep }) => {
      await ben.click(presence(ben.page).first());
      await ben.page.getByTestId('spacePlugin.presence.follow').first().waitFor();
      await sleep(1_200);
      await ben.click(ben.page.getByTestId('spacePlugin.presence.follow').first());
      // The followed row carries Stop in place of Follow until the follow opens Ada's diagram, whose canvas takes focus
      // and closes the list.
      await ben.page.getByTestId('spacePlugin.presence.stopFollowing').waitFor();
      await ben.page.getByTestId('spacePlugin.presence.stopFollowing').waitFor({ state: 'detached' });
      await waitFor(async () => path(ben.page) === path(ada.page), { what: "Ben on Ada's diagram" });
      for (const peer of [ada, ben]) {
        await waitFor(async () => (await accent(peer.page)) === 'amber', { what: `${peer.name}'s pill in amber` });
      }
      await sleep(1_500);
    },
  },
  {
    name: "Ada zooms and scrolls; Ben's view goes with her",
    subtitle: 'QA-7 step 3',
    run: async ({ peers: { ada, ben }, sleep }) => {
      await zoomAndPan(ada, { x: 570, y: 350 }, { x: 150, y: 80 }, sleep);
      await waitFor(async () => sameView(await shapeInView(ada.page), await shapeInView(ben.page)), {
        timeout: 10_000,
        what: "Ben's view matching Ada's",
      });
      await sleep(1_500);
    },
  },
  {
    name: 'Ada opens another diagram; Ben goes there too',
    subtitle: 'QA-7 step 4',
    run: async ({ peers: { ada, ben }, sleep }) => {
      await openDiagram(ada, 'Untitled', sleep);
      await waitFor(async () => (await pill(ada.page).innerText()).includes('Untitled'), { what: 'Ada on Untitled' });
      await waitFor(async () => path(ben.page) === path(ada.page), { timeout: 20_000, what: 'Ben on Untitled' });
      await sleep(1_500);
    },
  },
  {
    name: "Ben stops; Ada's moves no longer move him",
    subtitle: 'QA-7 step 5',
    run: async ({ peers: { ada, ben }, sleep }) => {
      const stop = ben.page.getByTestId('spacePlugin.presence.stopFollowing');
      if (!(await stop.isVisible())) {
        await ben.click(presence(ben.page).first());
        await stop.waitFor();
      }
      await sleep(1_000);
      await ben.click(stop);
      for (const peer of [ada, ben]) {
        await waitFor(async () => (await accent(peer.page)) === null, { what: `${peer.name}'s pill without amber` });
      }
      await ben.page.keyboard.press('Escape');
      const before = await shapeInView(ben.page);
      await zoomAndPan(ada, { x: 550, y: 320 }, { x: -100, y: 40 }, sleep);
      await sleep(2_000);
      if (JSON.stringify(await shapeInView(ben.page)) !== JSON.stringify(before)) {
        throw new Error("Ben's view moved after he stopped following");
      }
    },
  },
];

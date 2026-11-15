//
// Copyright 2026 DXOS.org
//

/**
 * Ada shares a diagram, Ben joins from the link, and each sees the other's presence, pointer and shapes live,
 * recorded side by side.
 *
 * @title Two people draw together
 * @mdl packages/apps/diagram-app/spec/APP.mdl test QA-6
 * @app diagram-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:9008 (EDGE preview signaling)
 *
 * A flow for `pair.mjs`: every step receives both peers. Built and served from `packages/apps/diagram-app`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run diagram-app:bundle-e2e
 *   pnpm exec vite preview --host 127.0.0.1 --port 9008 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs --flow packages/apps/diagram-app/autocue/two-people-draw.mjs \
 *     --url http://127.0.0.1:9008 --peers Ada,Ben --ready '[data-testid="canvas-toolbar"]' --out /tmp/pair
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

const shapes = (page) => page.locator('[data-testid^="views-row-"]:not([data-testid="views-row-layout"])');

const count = (locator, expected, what) => waitFor(async () => (await locator.count()) === expected, { what });

const path = (page) => new URL(page.url()).pathname;

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
  // Deselect, so the Properties panel gives way to the Views panel.
  await sceneKey(peer, 'Escape');
};

let link;

export const steps = [
  {
    name: 'Catch the copied invitation link',
    setup: true,
    run: async ({ peers: { ada } }) => {
      // The copy button writes to the clipboard, which a headless page cannot read back.
      await ada.page.evaluate(() => {
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
    name: 'Ada draws a rectangle',
    subtitle: 'QA-6 step 1',
    run: async ({ peers: { ada } }) => {
      await draw(ada, 'node:rect', { x: 200, y: 260 }, { x: 380, y: 380 });
      await count(shapes(ada.page), 1, "the rectangle in Ada's Views panel");
    },
  },
  {
    name: 'Ada shares: a multi-use invitation, and its link copied',
    subtitle: 'QA-6 step 2',
    run: async ({ peers: { ada }, sleep }) => {
      await ada.click(ada.page.getByTestId('diagram-app.share'));
      const dialog = ada.page.getByTestId('diagram-app.share-dialog');
      await ada.click(dialog.getByTestId('membersContainer.createInvitation'));
      await ada.click(dialog.getByTestId('copy-invitation'));
      link = await ada.page.evaluate(() => window.__copied);
      if (!link?.includes('spaceInvitationCode=')) {
        throw new Error(`the copy button copied no invitation link: ${link}`);
      }
      await sleep(1_500);
      await ada.page.keyboard.press('Escape');
    },
  },
  {
    name: "Ben opens the link and lands on Ada's diagram",
    subtitle: 'QA-6 step 3',
    run: async ({ peers: { ada, ben }, sleep }) => {
      await ben.page.goto(link);
      await ben.page.getByTestId('canvas-toolbar').waitFor({ timeout: TIMEOUT });
      await waitFor(async () => path(ben.page) === path(ada.page), { what: "Ben on Ada's diagram" });
      await count(shapes(ben.page), 1, "Ada's rectangle on Ben's canvas");
      await ben.click(ben.page.getByTestId('diagram-app.space-menu'));
      await count(
        ben.page.getByTestId('diagram-app.space-list').locator('[data-testid^="diagram-app.space."]'),
        1,
        'one space',
      );
      await sleep(1_500);
      await ben.page.keyboard.press('Escape');
    },
  },
  {
    name: 'Each sees the other beside Share',
    subtitle: 'QA-6 step 4',
    run: async ({ peers: { ada, ben } }) => {
      // Both frame the diagram, so the panes share a camera and Ben's pointer lands at the same spot in Ada's pane.
      for (const peer of [ada, ben]) {
        await sceneKey(peer, 'Home');
      }
      for (const peer of [ada, ben]) {
        await count(peer.page.getByTestId('spacePlugin.presence.member'), 1, `${peer.name} seeing the other`);
      }
    },
  },
  {
    name: "Ben's pointer moves on Ada's canvas",
    subtitle: 'QA-6 step 5',
    run: async ({ peers: { ada, ben } }) => {
      const cursors = ada.page.getByTestId('remote-cursor');
      // A pointer posted before the peers connect is lost, so keep moving until one lands.
      const points = [
        { x: 560, y: 240 },
        { x: 600, y: 400 },
        { x: 460, y: 560 },
        { x: 300, y: 460 },
      ];
      let index = 0;
      await waitFor(
        async () => {
          await ben.move(points[index++ % points.length]);
          return (await cursors.count()) === 1;
        },
        { what: "Ben's cursor on Ada's canvas" },
      );
      // Each point waits for Ada's copy of the cursor to arrive, so the two panes show it at the same spot.
      for (const point of points) {
        await ben.move(point, { steps: 15 });
        await waitFor(
          async () => {
            const box = await cursors.first().boundingBox();
            return !!box && Math.abs(box.x - point.x) < 8 && Math.abs(box.y - point.y) < 8;
          },
          { timeout: 5_000, what: "Ben's cursor at the same spot on Ada's canvas" },
        ).catch((err) => console.warn(err.message));
      }
    },
  },
  {
    name: 'Ben draws an ellipse; it arrives on Ada’s canvas',
    subtitle: 'QA-6 step 6',
    run: async ({ peers: { ada, ben } }) => {
      await draw(ben, 'node:ellipse', { x: 150, y: 580 }, { x: 310, y: 700 });
      await count(shapes(ada.page), 2, "both shapes in Ada's Views panel");
    },
  },
  {
    name: 'Ada adds a diagram named “Roadmap”; Ben’s menu lists it',
    subtitle: 'QA-6 step 7',
    run: async ({ peers: { ada, ben }, sleep }) => {
      await ada.click(ada.page.getByTestId('diagram-app.diagram-menu'));
      await ada.page.getByTestId('diagram-app.diagram-list.find').waitFor();
      await ada.type('Roadmap', { delay: 80 });
      await sleep(600);
      await ada.click(ada.page.getByTestId('diagram-app.new-diagram'));
      await waitFor(async () => (await ada.page.getByTestId('diagram-app.pill').innerText()).includes('Roadmap'), {
        what: "Ada's pill on Roadmap",
      });
      await ben.click(ben.page.getByTestId('diagram-app.diagram-menu'));
      const entries = ben.page
        .getByTestId('diagram-app.diagram-list')
        .locator('[data-testid^="diagram-app.diagram."]:not([data-testid$=".actions"])');
      await count(entries, 2, "Roadmap in Ben's diagram menu");
      await sleep(2_500);
      await ben.page.keyboard.press('Escape');
    },
  },
  {
    name: 'Both people edit one space, peer to peer, with no account',
    run: async ({ sleep }) => {
      await sleep(6_000);
    },
  },
];

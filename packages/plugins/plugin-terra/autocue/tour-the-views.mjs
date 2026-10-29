//
// Copyright 2026 DXOS.org
//

/**
 * Populate a planet with five random objects, spin the globe, then move slowly between the 3D, map and camera views
 * before returning to the globe.
 *
 * @mdl packages/plugins/plugin-terra/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Record headless on the GPU, in light mode:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/terra-views \
 *     --gpu on --theme light --fps 60 --width 1920 --height 1080 --scale 2
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

/** How long each view is held, so the viewer can take it in before the next. */
const VIEW_HOLD = 3_500;

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/**
 * Orbits the camera with a slow horizontal drag across the canvas, and with `zoom` (wheel notches, negative to zoom in)
 * spread over the drag dollies the camera at the same time; the simulation itself is already running.
 */
const spin = async (page, { dx = 700, ms = 4_000, steps = 80, zoom = 0 } = {}) => {
  const box = await page.locator('[data-testid="deck.plank"] canvas').last().boundingBox();
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2 - dx / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y);
    await page.waitForTimeout(ms / steps);
  }
  await page.mouse.up();
  // A few separate notches: a wheel event per drag step resolves slowly and stretches the drag several-fold.
  for (let i = 0; i < Math.abs(zoom); i++) {
    await page.mouse.wheel(0, Math.sign(zoom) * 120);
    await page.waitForTimeout(150);
  }
};

/** Switches the article to a view by its tab. */
const view = (demo, name, label) =>
  demo.click({ selector: `[data-testid="terra.toolbar.view-${name}"] >> nth=0`, label });

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Terra, close the help panel',
    setup: true,
    done: ({ page }) =>
      page.evaluate(() => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.terra' && plugin.active)),
    run: async ({ page }) => {
      // A cold first load can outlast the driver's navigation; operations only resolve once the space has booted.
      await page
        .locator('[data-testid="spacePlugin.createObject"]')
        .first()
        .waitFor({ state: 'visible', timeout: 120_000 });
      const notice = page.locator('[data-testid="toast.close"]');
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }
      // Terra is off by default in every environment.
      await page.evaluate(() =>
        composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: ['org.dxos.plugin.terra'] }),
      );
      await page.waitForFunction(
        () => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.terra' && plugin.active),
        undefined,
        { timeout: 20_000 },
      );
      const close = page.locator('role=button[name="Close companion"]');
      if (await visible(close, 1_000)) {
        await close.first().click();
      }
    },
  },
  {
    name: 'Create the planet',
    narration: 'Add a planet to your space.',
    done: async ({ page }) => (await page.locator('[data-testid="terra.toolbar.add-random-object"]').count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.terra"]', label: 'Terra' });
      await page
        .locator('[data-testid="terra.toolbar.add-random-object"]')
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Create five random objects',
    narration: 'Drop five objects onto the planet; each moves on its own course.',
    run: async ({ demo, page }) => {
      for (let i = 0; i < 5; i++) {
        await demo.click({ selector: '[data-testid="terra.toolbar.add-random-object"] >> nth=0', label: 'Add object' });
        await page.waitForTimeout(900);
      }
      // Judged by the telemetry panel, which lists one option per object.
      await page.waitForFunction(
        () => document.querySelectorAll('[role="listbox"] [role="option"]').length >= 5,
        undefined,
        {
          timeout: 10_000,
        },
      );
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Show the rotation gizmos',
    narration: "Gizmos show each object's heading and orientation.",
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="terra.toolbar.toggle-gizmos"] >> nth=0', label: 'Gizmos' });
      await page.waitForTimeout(BEAT * 1.5);
    },
  },
  {
    name: 'Slowly rotate and zoom in',
    narration: 'Turn the globe and move in to follow them.',
    run: async ({ page }) => {
      await spin(page, { dx: 600, ms: 6_000, steps: 120, zoom: -1 });
      await page.waitForTimeout(BEAT);
      await spin(page, { dx: 400, ms: 5_000, steps: 100, zoom: -1 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Toggle slowly between the 3D, map and camera views',
    narration: 'The same world as a flat map, and from the point of view of one of its objects.',
    run: async ({ demo, page }) => {
      await view(demo, 'map', 'Map');
      await page.waitForTimeout(VIEW_HOLD);
      await view(demo, 'camera', 'Camera');
      await page.waitForTimeout(VIEW_HOLD + BEAT);
      await view(demo, 'scene', '3D');
      await page.waitForTimeout(VIEW_HOLD);
      await view(demo, 'map', 'Map');
      await page.waitForTimeout(VIEW_HOLD);
      await view(demo, 'camera', 'Camera');
      await page.waitForTimeout(VIEW_HOLD);
    },
  },
  {
    name: 'Back to the globe',
    narration: 'Back to the globe, where every object keeps moving.',
    run: async ({ demo, page }) => {
      await view(demo, 'scene', '3D');
      await page.waitForTimeout(BEAT);
      await spin(page, { dx: 400, ms: 4_000 });
      await page.waitForTimeout(BEAT * 4);
    },
  },
];

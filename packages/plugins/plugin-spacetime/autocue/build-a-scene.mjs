//
// Copyright 2026 DXOS.org
//

/**
 * Create a scene, add objects from the toolbar's templates (a primitive and two vehicle presets), and orbit it.
 *
 * @mdl packages/plugins/plugin-spacetime/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Record headless on the GPU, in light mode:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/spacetime \
 *     --gpu on --theme light --fps 60 --width 1920 --height 1080 --scale 2
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** The open scene's plank. */
const plank = (page) => page.locator('[data-testid="deck.plank"]').last();

/** Picks an object template from the toolbar's "Object type" menu. */
const chooseTemplate = async (demo, page, label) => {
  // The first menu button in the scene's toolbar; the plank heading has its own menu above it.
  await demo.click({
    selector: '[data-testid="deck.plank"] >> nth=-1 >> [role="toolbar"] button[aria-haspopup="menu"] >> nth=0',
    label: 'Object type',
  });
  await demo.click({ selector: `[role^="menuitem"]:has-text("${label}") >> nth=0`, label });
  await page.waitForTimeout(300);
};

/** Adds an object of the chosen template to the scene. */
const addObject = (demo) =>
  demo.click({
    selector: '[data-testid="deck.plank"] >> nth=-1 >> button[aria-label="Add object"] >> nth=0',
    label: 'Add object',
  });

/** Orbits the camera with a slow drag across the canvas, optionally zooming in with the wheel along the way. */
const orbit = async (page, { dx = 600, dy = 60, ms = 4_000, steps = 80, zoom = 0 } = {}) => {
  const box = await plank(page).locator('canvas').first().boundingBox();
  const x = box.x + box.width / 2 - dx / 2;
  const y = box.y + box.height / 2 - dy / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y + dy * Math.sin((Math.PI * i) / steps));
    await page.waitForTimeout(ms / steps);
  }
  await page.mouse.up();
  // A few separate notches: a wheel event per drag step resolves slowly and stretches the drag several-fold.
  for (let i = 0; i < Math.abs(zoom); i++) {
    await page.mouse.wheel(0, Math.sign(zoom) * 120);
    await page.waitForTimeout(150);
  }
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Spacetime, close the help panel',
    setup: true,
    done: ({ page }) =>
      page.evaluate(() =>
        composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.spacetime' && plugin.active),
      ),
    run: async ({ page }) => {
      const notice = page.locator('[data-testid="toast.close"]');
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }
      // Spacetime ships in the experimental set and is off by default.
      await page.evaluate(() =>
        composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: ['org.dxos.plugin.spacetime'] }),
      );
      await page.waitForFunction(
        () => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.spacetime' && plugin.active),
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
    name: 'Create the scene',
    narration: 'Add a 3D scene to your space; it starts with a cube.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.spacetime.scene"]',
        label: 'Scene',
      });
      await plank(page).locator('canvas').first().waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Add a sphere',
    narration: 'Choose a primitive and add it.',
    run: async ({ demo, page }) => {
      await chooseTemplate(demo, page, 'Sphere');
      await addObject(demo);
      await page.waitForTimeout(BEAT * 1.5);
    },
  },
  {
    name: 'Add two vehicles',
    narration: 'Presets drop in ready-made models.',
    run: async ({ demo, page }) => {
      await chooseTemplate(demo, page, 'Fire truck');
      await addObject(demo);
      await page.waitForTimeout(BEAT * 1.5);
      await chooseTemplate(demo, page, 'Taxi');
      await addObject(demo);
      await page.waitForTimeout(BEAT * 1.5);
    },
  },
  {
    name: 'Orbit the scene',
    narration: 'Orbit and zoom to look around the scene.',
    run: async ({ page }) => {
      await orbit(page, { dx: 1_400, ms: 5_000, steps: 100, zoom: -4 });
      await page.waitForTimeout(BEAT);
      await orbit(page, { dx: -1_000, dy: -80, ms: 4_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Close on the scene',
    narration: 'Scenes are objects in your space, so they sync like everything else.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 5);
    },
  },
];

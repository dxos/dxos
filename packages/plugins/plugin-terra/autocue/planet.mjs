//
// Copyright 2026 DXOS.org
//

/**
 * Create a planet, spin it, and reshape it live: reseed it, raise the sea, thicken the forests, scatter objects, and
 * look at it as a map.
 *
 * @mdl packages/plugins/plugin-terra/PLUGIN.mdl test QA-1
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Record headless on the GPU, in light mode:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/terra \
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

/** Steps a slider by its thumb's accessible name, one arrow press at a time, so the planet regenerates as it moves. */
const nudge = async (page, name, key, presses, delay = 90) => {
  await page.getByRole('slider', { name }).first().focus();
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(delay);
  }
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Terra, close the help panel',
    setup: true,
    done: ({ page }) =>
      page.evaluate(() => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.terra' && plugin.active)),
    run: async ({ page }) => {
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
    done: async ({ page }) => (await page.locator('[data-testid="terra.toolbar.toggle-playing"]').count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.terra"]', label: 'Terra' });
      await page.getByRole('slider', { name: 'Water level' }).first().waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Spin it',
    narration: 'Every planet is generated from a seed, so the same seed always gives the same world.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="terra.toolbar.toggle-playing"] >> nth=0', label: 'Play' });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Reseed it',
    narration: 'Reseed for a new world.',
    run: async ({ demo, page }) => {
      for (let i = 0; i < 3; i++) {
        await demo.click({ selector: 'button:has-text("Reseed") >> nth=0', label: 'Reseed' });
        await page.waitForTimeout(BEAT * 1.5);
      }
    },
  },
  {
    name: 'Reshape it with live parameters',
    narration: 'Raise the sea and thicken the forests; the terrain regenerates as you drag.',
    run: async ({ page }) => {
      await nudge(page, 'Water level', 'ArrowRight', 18);
      await page.waitForTimeout(BEAT);
      await nudge(page, 'Water level', 'ArrowLeft', 10);
      await page.waitForTimeout(BEAT);
      await nudge(page, 'Tree density', 'ArrowRight', 12);
      await page.waitForTimeout(BEAT);
      await nudge(page, 'Mountain scale', 'ArrowRight', 10);
      await page.waitForTimeout(BEAT * 1.5);
    },
  },
  {
    name: 'Scatter objects on it',
    narration: 'Drop objects onto the surface.',
    run: async ({ demo, page }) => {
      for (let i = 0; i < 4; i++) {
        await demo.click({ selector: '[data-testid="terra.toolbar.add-random-object"] >> nth=0', label: 'Add object' });
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'See it as a map',
    narration: 'The same world, flattened into a map.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="terra.toolbar.view-map"] >> nth=0', label: 'Map' });
      await page.waitForTimeout(BEAT * 3);
      await demo.click({ selector: '[data-testid="terra.toolbar.view-scene"] >> nth=0', label: '3D' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close on the finished planet',
    narration: 'Planets are ordinary objects in your space, so they sync and work offline like everything else.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 6);
    },
  },
];

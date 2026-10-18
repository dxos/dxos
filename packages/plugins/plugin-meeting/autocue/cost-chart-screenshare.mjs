//
// Copyright 2026 DXOS.org
//

/**
 * The screen Lucía shares in the four-person meeting: Fieldstone Labs' "Cloud cost forecast" sheet, charted.
 *
 * @app composer-app dev build (plugin-debug's Fieldstone template on), via
 *   `DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173`
 *
 * Recorded without the action feed or captions, since it plays inside a call tile as a screenshare:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/meeting/screenshare \
 *     --theme light --captions off --overlay off --width 1600 --height 1000
 *
 * Trim it, then hand the result to `conversation.mjs` as the presenter's `screenshare.file`.
 */

const TEMPLATE = 'Fieldstone Labs';
const SHEET = 'Cloud cost forecast';
const DEBUG = 'org.dxos.plugin.debug';
const SHEETS = 'org.dxos.plugin.sheet';
const PLANK = '[data-testid="deck.plank"]';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const appears = (locator, timeout) =>
  locator.waitFor({ state: 'visible', timeout }).then(
    () => true,
    () => false,
  );

const state = {};

export const steps = [
  {
    name: 'Prep (off camera): the Fieldstone space, with its cost forecast open',
    setup: true,
    run: async ({ demo, page }) => {
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (await appears(notice.first(), 8_000)) {
        await notice
          .first()
          .click({ timeout: 10_000 })
          .catch(() => {});
      }
      await page.evaluate(
        (ids) => composer.invoke('org.dxos.operation.registry.enablePlugins', { ids }),
        [DEBUG, SHEETS],
      );
      await page.waitForFunction(
        (ids) => composer.plugins().filter((plugin) => ids.includes(plugin.id) && plugin.enabled).length === ids.length,
        [DEBUG, SHEETS],
        { timeout: 60_000, polling: 500 },
      );

      await page.keyboard.press('Escape');
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', hud: false });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', hud: false });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
        hud: false,
      });
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', hud: false });
      await page
        .locator('[data-testid="deck.sidebar"] [data-part="branch-control"]:has(:text-is("Projects"))')
        .first()
        .waitFor({ state: 'visible', timeout: 180_000 });
      await page.waitForTimeout(BEAT * 2);

      // A space still initializing throws on `properties`.
      const findSheet = ([template, sheet]) =>
        (async () => {
          const space = dxos.client.spaces
            .get()
            .filter((space) => {
              try {
                return space.properties?.name === template;
              } catch {
                return false;
              }
            })
            .at(-1);
          const objects = await space.db.query(dxos.Filter.everything()).run();
          const found = objects.find(
            (object) => dxos.Obj.getTypename(object) === 'org.dxos.type.sheet' && object.name === sheet,
          );
          return found && { spaceId: space.id, sheetId: found.id };
        })();
      const handle = await page.waitForFunction(findSheet, [TEMPLATE, SHEET], { timeout: 120_000, polling: 1_000 });
      Object.assign(state, await handle.jsonValue());
      await page.evaluate(
        ({ spaceId }) =>
          composer.invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` }),
        state,
      );
      await page.evaluate(
        ({ spaceId, sheetId }) =>
          composer.invoke('org.dxos.operation.appToolkit.open', {
            subject: [`root/${spaceId}/system/database/org.dxos.type.sheet/${sheetId}`],
          }),
        state,
      );
      await page.locator(`${PLANK}`).getByText(SHEET).first().waitFor({ timeout: 30_000 });
      // The shared screen is about the sheet, so the navigation sidebar goes.
      const closeSidebar = page.locator('button[aria-label="Close sidebar"]').first();
      if (await appears(closeSidebar, 4_000)) {
        await closeSidebar.click();
      }
      await page.waitForTimeout(BEAT);
      await demo.cut();
    },
  },
  {
    name: 'Chart the forecast',
    run: async ({ demo, page }) => {
      await page.waitForTimeout(BEAT);
      // Month, AWS and Cloudflare for the actual month and the six forecast months.
      await demo.click({ selector: `${PLANK} [data-testid="grid.0.0"]`, label: 'A1' });
      await page.keyboard.down('Shift');
      await demo.click({ selector: `${PLANK} [data-testid="grid.2.7"]`, label: 'C8' });
      await page.keyboard.up('Shift');
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: '[data-testid="deck.companion.tab.charts"]', label: 'Charts' });
      await demo.click({
        selector: '[data-testid="deck.companion"] button[aria-label="Add chart"]',
        label: 'Add chart',
      });
      await page.waitForTimeout(BEAT * 4);
    },
  },
];

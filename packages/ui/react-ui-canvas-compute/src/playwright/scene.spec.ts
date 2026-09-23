//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

const PORT = 9007;
const TRANSFORM_URL = storybookUrl('ui-react-ui-canvas-compute-scene--transform', PORT);
const LOGIC_URL = storybookUrl('ui-react-ui-canvas-compute-scene--logic', PORT);

/** The die a `random` shape draws; its icon name changes as it spins, so match the family. */
const DICE = 'svg:has(use[href*="dice"])';
const SWITCH = 'input.dx-checkbox--switch';
const BEACON = 'svg:has(use[href*="sun"])';

// Serial: the story's cold compile is minutes of the budget, so it is paid once for the file.
test.describe.configure({ mode: 'serial' });

test.describe('compute scene', () => {
  let page: Page;
  let close: (() => Promise<void>) | undefined;
  const errors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    ({ page, close } = await setupPage(browser, { url: TRANSFORM_URL, viewportSize: { width: 1400, height: 900 } }));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.locator('[data-node-id]').first().waitFor({ state: 'visible', timeout: 150_000 });
    await page.waitForTimeout(1_000);
  });

  test.afterAll(async () => {
    await close?.();
    close = undefined;
  });

  test('a shape component fills its node, so its content is centred rather than in the corner', async () => {
    const icon = page.locator(`[data-node-id] ${DICE}`).first();
    await expect(icon).toBeVisible();
    const node = page
      .locator('[data-node-id]')
      .filter({ has: page.locator(DICE) })
      .first();

    const iconBox = (await icon.boundingBox())!;
    const nodeBox = (await node.boundingBox())!;
    // The shape components centre themselves within a full-size flex container, which is what the
    // editor's frame body gave them; without it they collapse to the top of the node.
    expect(Math.abs(iconBox.x + iconBox.width / 2 - (nodeBox.x + nodeBox.width / 2))).toBeLessThan(2);
    expect(Math.abs(iconBox.y + iconBox.height / 2 - (nodeBox.y + nodeBox.height / 2))).toBeLessThan(2);
  });

  test('clicking a shape control runs its operation rather than only selecting the node', async () => {
    await page.locator(`[data-node-id] ${DICE}`).first().click();
    // The die spins only from inside the click handler that writes the output, so the animation is the
    // operation having run — the node frame would otherwise have taken the press as select-and-drag.
    await expect(page.locator('[data-node-id] svg[class*="animate-"]').first()).toBeVisible({ timeout: 2_000 });
    expect(errors).toEqual([]);
  });
});

test.describe('compute scene logic', () => {
  let page: Page;
  let close: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ browser }) => {
    ({ page, close } = await setupPage(browser, { url: LOGIC_URL, viewportSize: { width: 1400, height: 900 } }));
    await page.locator('[data-node-id]').first().waitFor({ state: 'visible', timeout: 150_000 });
    await page.waitForTimeout(1_000);
  });

  test.afterAll(async () => {
    await close?.();
    close = undefined;
  });

  test('toggling the switches propagates through the gates to the beacon', async () => {
    const beacon = page.locator(`[data-node-id] ${BEACON}`).first();
    const lit = () => beacon.evaluate((node) => node.getAttribute('class')?.includes('opacity-100') ?? false);
    expect(await lit()).toBe(false);

    // Two switches feed the AND, whose output feeds the OR, whose output lights the beacon — so the
    // beacon is the whole chain having run off a control the node frame used to swallow.
    for (const index of [0, 1]) {
      await page.locator(SWITCH).nth(index).click();
      await page.waitForTimeout(500);
    }
    await expect.poll(lit, { timeout: 5_000 }).toBe(true);
  });
});

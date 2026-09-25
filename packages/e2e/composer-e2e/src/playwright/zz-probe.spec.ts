import { test } from '@playwright/test';

import { AppManager } from './app-manager.ts';

const EVENTS = ['pointerdown', 'mousedown', 'pointermove', 'dragstart', 'dragenter', 'dragover', 'drop', 'dragend', 'mouseup'];

const setup = async (browser: any) => {
  const host = new AppManager(browser, false);
  await host.init();
  await host.createSpace();
  await host.createObject({ type: 'Collection' });
  await host.createObject({ type: 'Collection' });
  await host.expandSection('spacePlugin.collectionsSection');
  await host.page.evaluate((events) => {
    (window as any).__ev = [];
    for (const t of events) {
      document.addEventListener(t, () => (window as any).__ev.push(t), true);
    }
  }, EVENTS);
  return host;
};

const events = (host: AppManager) =>
  host.page.evaluate(() => {
    const ev: string[] = (window as any).__ev;
    const counts: Record<string, number> = {};
    for (const e of ev) counts[e] = (counts[e] ?? 0) + 1;
    return JSON.stringify(counts);
  });

test.describe('probe', () => {
  test.skip(({ browserName }) => browserName !== 'webkit');

  test('probe webkit mouse drag', async ({ browser }) => {
    const host = await setup(browser);
    const active = host.getObject(0);
    const box = (await active.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await active.hover();
    await host.page.mouse.down();
    for (const dy of [2, 6, 12, 20, 40, 60]) {
      await host.page.mouse.move(x, y + dy, { steps: 4 });
      console.log(`PROBE mouse dy=${dy} ${await events(host)} hidden=${await active.isHidden()}`);
    }
    await host.page.mouse.up();
    console.log(`PROBE mouse up ${await events(host)}`);
    await host.close();
  });

  test('probe webkit locator.dragTo', async ({ browser }) => {
    const host = await setup(browser);
    await host.getObject(0).dragTo(host.getObject(1));
    console.log(`PROBE dragTo ${await events(host)}`);
    await host.close();
  });
});

//
// Copyright 2026 DXOS.org
//

const OVERLAY_ID = 'autocue-show-page';

/**
 * Shows a live screenshot of `url` full screen over the recorded app for `hold` ms.
 * The page loads in a second tab, which the recorder does not capture, so the app never navigates away and reloads.
 */
export const showPage = async (page, url, { hold, ready }) => {
  const tab = await page.context().newPage();
  let image;
  try {
    // GitHub through the sandbox proxy intermittently fails a first navigation.
    for (let attempt = 0; ; attempt++) {
      const error = await tab.goto(url, { waitUntil: 'commit', timeout: 30_000 }).then(
        () => undefined,
        (error) => error,
      );
      if (!error) {
        break;
      }
      if (attempt >= 5) {
        throw error;
      }
      await tab.waitForTimeout(3_000);
    }
    await tab.waitForLoadState('load', { timeout: 60_000 }).catch(() => {});
    if (ready) {
      await tab
        .getByText(ready)
        .first()
        .waitFor({ timeout: 60_000 })
        .catch(() => {});
    }
    await tab.waitForTimeout(1_000);
    image = (await tab.screenshot({ type: 'png' })).toString('base64');
  } finally {
    await tab.close();
  }

  await page.evaluate(
    ({ id, src }) => {
      const img = document.createElement('img');
      img.id = id;
      img.src = src;
      // Below the driver's cursor and caption layers, above the app.
      img.style.cssText =
        'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:2147483645;pointer-events:none';
      document.body.append(img);
    },
    { id: OVERLAY_ID, src: `data:image/png;base64,${image}` },
  );
  await page.waitForTimeout(hold);
  await page.evaluate((id) => document.getElementById(id)?.remove(), OVERLAY_ID);
};

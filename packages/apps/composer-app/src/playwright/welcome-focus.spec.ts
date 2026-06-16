//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

type FocusSample = {
  ms: number;
  tag: string;
  role: string | null;
  testId: string | null;
  placeholder: string | null;
  text: string | null;
};

const storyUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

const collectFocusTimeline = async (page: import('@playwright/test').Page, durationMs: number, intervalMs: number) => {
  return page.evaluate(
    async ({ durationMs, intervalMs }) => {
      const describeActive = () => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) {
          return { tag: String(active), role: null, testId: null, placeholder: null, text: null };
        }
        return {
          tag: active.tagName.toLowerCase(),
          role: active.getAttribute('role'),
          testId: active.getAttribute('data-testid'),
          placeholder: active instanceof HTMLInputElement ? active.placeholder : null,
          text: active.textContent?.trim().slice(0, 40) ?? null,
        };
      };

      const samples = [];
      const started = performance.now();
      while (performance.now() - started < durationMs) {
        samples.push({ ms: Math.round(performance.now() - started), ...describeActive() });
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      return samples;
    },
    { durationMs, intervalMs },
  );
};

const logTimeline = (label: string, timeline: FocusSample[]) => {
  // eslint-disable-next-line no-console
  console.log(`[welcome-focus] ${label}:\n` + JSON.stringify(timeline, null, 2));
};

const expectEmailHoldsFocus = (label: string, timeline: FocusSample[]) => {
  const last = timeline.at(-1)!;
  const emailFocusedSamples = timeline.filter((sample) => sample.placeholder === 'Your email');
  const tabFocusedSamples = timeline.filter((sample) => sample.role === 'tab');

  expect(
    emailFocusedSamples.length,
    `${label}: email should be focused at least once; final=${JSON.stringify(last)}; tab samples=${tabFocusedSamples.length}`,
  ).toBeGreaterThan(0);

  expect(last.placeholder, `${label}: email should hold focus at end; tail=${JSON.stringify(timeline.slice(-5))}`).toBe(
    'Your email',
  );
};

test.describe.skip('Welcome focus', () => {
  test('EmailPrimary story keeps email focused', async ({ page }) => {
    await page.goto(storyUrl('apps-composer-app-welcome--email-primary'));
    await expect(page.getByPlaceholder('Your email')).toBeVisible({ timeout: 60_000 });

    const timeline = await collectFocusTimeline(page, 2_000, 50);
    logTimeline('EmailPrimary', timeline);
    expectEmailHoldsFocus('EmailPrimary', timeline);
  });

  test('Default story focuses email after switching from passkey', async ({ page }) => {
    await page.goto(storyUrl('apps-composer-app-welcome--default'));

    const passkey = page.getByRole('button', { name: /log in with passkey/i });
    const emailInput = page.getByPlaceholder('Your email');

    await expect(passkey.or(emailInput)).toBeVisible({ timeout: 60_000 });

    if (await passkey.isVisible()) {
      await page.getByRole('button', { name: /more ways to log in/i }).click();
      await page.getByRole('menuitem', { name: /email/i }).click();
    }

    await expect(emailInput).toBeVisible();

    const timeline = await collectFocusTimeline(page, 2_000, 50);
    logTimeline('Default→email', timeline);
    expectEmailHoldsFocus('Default→email', timeline);
  });
});

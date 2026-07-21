//
// Copyright 2026 DXOS.org
//

import { type Page } from '@browserbasehq/stagehand';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import { createSession } from './session';

type FocusSample = {
  ms: number;
  tag: string;
  role: string | null;
  testId: string | null;
  placeholder: string | null;
  text: string | null;
};

const storyUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

// Samples `document.activeElement` on a fixed cadence — the regression under test is a
// focus *timeline* (does focus bounce away from the email input), which is inherently a
// DOM-level measurement rather than something expressible as an AI extraction.
const collectFocusTimeline = async (page: Page, durationMs: number, intervalMs: number) => {
  return page.evaluate(
    async ({ durationMs, intervalMs }: { durationMs: number; intervalMs: number }) => {
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

describe.skip('Welcome focus', () => {
  test('EmailPrimary story keeps email focused', async () => {
    const session = await createSession();
    try {
      await session.page.goto(storyUrl('apps-composer-app-welcome--email-primary'));
      await session.page.waitForLoadState('networkidle', 60_000);

      const timeline = await collectFocusTimeline(session.page, 2_000, 50);
      logTimeline('EmailPrimary', timeline);
      expectEmailHoldsFocus('EmailPrimary', timeline);
    } finally {
      await session.close();
    }
  });

  test('Default story focuses email after switching from passkey', async () => {
    const session = await createSession();
    try {
      await session.page.goto(storyUrl('apps-composer-app-welcome--default'));
      await session.page.waitForLoadState('networkidle', 60_000);

      const state = await session.stagehand.extract(
        'Is a "Log in with passkey" button visible on the page?',
        z.object({ passkeyVisible: z.boolean() }),
        { page: session.page },
      );
      if (state.passkeyVisible) {
        await session.stagehand.act('Click the "More ways to log in" button', { page: session.page });
        await session.stagehand.act('Click the "Email" option in the menu that opened', { page: session.page });
      }

      const timeline = await collectFocusTimeline(session.page, 2_000, 50);
      logTimeline('Default→email', timeline);
      expectEmailHoldsFocus('Default→email', timeline);
    } finally {
      await session.close();
    }
  });
});

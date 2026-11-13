//
// Copyright 2026 DXOS.org
//

/**
 * Forks a live chat at its first answer: the fork sees the chat up to that answer, what is asked there stays out of
 * the main conversation, and merging brings back only the fork's conclusion.
 *
 * @title Forks
 * @mdl packages/core/compute/compute/docs/trajectory/LIGHT-THREADS.mdl test QA-5
 * @app composer-app at the PR preview, or via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4183`
 * @driver `--caption-position top --caption-background 0.6`
 */

const SUBTITLE = 'LIGHT-THREADS.mdl · QA-5';
const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const FORK = '[data-testid="chat.fork"]';
const MARKER = '[data-testid="chat.fork-marker"]';
const BAR = '[data-testid="assistant.fork-bar"]';
const ANSWER_TIMEOUT = 90_000;

const caption = async (demo, value) => {
  await demo.caption({ value, subtitle: SUBTITLE });
  await demo.sleep({ ms: 1_800 });
};

/** The chat's text as the reader sees it. */
const threadText = (page) =>
  page.evaluate(
    () => document.querySelector('[data-testid="assistant.prompt"]')?.closest('article, main, body')?.innerText ?? '',
  );

/** Sends a prompt and waits until the answers under it carry `count` fork buttons. */
const ask = async (demo, page, text, count) => {
  await demo.type({ selector: PROMPT, value: text, delay: 40 });
  await demo.press({ key: 'Enter' });
  await page.waitForFunction(
    ([selector, count]) => document.querySelectorAll(selector).length >= count,
    [FORK, count],
    { timeout: ANSWER_TIMEOUT },
  );
  // The answer settles once its turn ends, which the stop button leaving says.
  await page
    .locator('[data-testid="assistant.stop"]')
    .waitFor({ state: 'hidden', timeout: ANSWER_TIMEOUT })
    .catch(() => {});
  await demo.sleep({ ms: 1_500 });
};

export const steps = [
  {
    name: 'Open a new chat',
    setup: true,
    done: ({ page }) =>
      page
        .locator(PROMPT)
        .count()
        .then((count) => count > 0 && page.url().includes('assistant.chat')),
    run: async ({ page }) => {
      const url = await page.evaluate(async () => {
        const client = globalThis.__DXOS__.client;
        const space = client.spaces.default ?? client.spaces.get()[0];
        const options = { spaceId: space.id };
        const invoke = (key, input) => globalThis.composer.invoke(key, input, options);
        const { object: chat } = await invoke('org.dxos.operation.assistant.createChat', { name: 'Forks' });
        await invoke('org.dxos.operation.space.addObject', { object: chat });
        await space.db.flush();
        return `${location.origin}/w/${space.id}/db/org.dxos.type.assistant.chat+${chat.id}`;
      });
      await page.goto(url);
      await page.locator(PROMPT).waitFor({ state: 'visible', timeout: 30_000 });
      for (const selector of [
        'li[role="status"]:has-text("Privacy Notice") button:has-text("Close")',
        'button[aria-label="Close companion"]',
      ]) {
        const control = page.locator(selector);
        if (await control.count()) {
          await control.first().click();
        }
      }
      await page.waitForTimeout(2_000);
    },
  },
  {
    name: 'Ask two questions on main',
    run: async ({ demo, page }) => {
      await demo.cut();
      await demo.title({ value: 'Forks', subtitle: 'Branch a chat at any answer', hold: 3_600 });
      await caption(demo, 'Two questions on the main conversation');
      await ask(demo, page, 'Pick one colour. Reply with the colour only.', 1);
      await ask(demo, page, 'Pick one animal. Reply with the animal only.', 2);
    },
  },
  {
    name: 'Fork at the first answer',
    run: async ({ demo, page }) => {
      await caption(demo, 'Fork at the first answer: the fork sees the chat up to there');
      await page.locator(FORK).first().hover();
      await demo.click({ selector: `${FORK} >> nth=0`, label: 'Fork the conversation here' });
      await page.locator(BAR).waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Ask in the fork',
    run: async ({ demo, page }) => {
      await caption(demo, 'What is asked in the fork stays out of the main conversation');
      await ask(demo, page, 'Pick one shape. Reply with the shape only.', 2);
      if ((await threadText(page)).includes('Pick one animal')) {
        throw new Error('the fork shows the animal question, which came after its fork point');
      }
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Back to main',
    run: async ({ demo, page }) => {
      await caption(demo, 'Main is unchanged; a marker shows where the fork starts');
      await demo.click({ selector: '[data-testid="assistant.fork-back"]', label: 'Back to main' });
      await page.locator(MARKER).first().waitFor({ state: 'visible', timeout: 15_000 });
      if ((await threadText(page)).includes('Pick one shape')) {
        throw new Error('main shows the question asked in the fork');
      }
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Merge the fork',
    run: async ({ demo, page }) => {
      await caption(demo, 'Merging brings back only the fork’s conclusion');
      await demo.click({ selector: `${MARKER} >> nth=0`, label: 'Open the fork' });
      await page.locator(BAR).waitFor({ state: 'visible', timeout: 15_000 });
      await demo.sleep({ ms: 1_500 });
      await demo.click({ selector: '[data-testid="assistant.fork-merge"]', label: 'Merge into main' });
      await page.locator(BAR).waitFor({ state: 'hidden', timeout: 15_000 });
      await page.getByText('fork concluded', { exact: false }).last().waitFor({ state: 'visible', timeout: 15_000 });
      await caption(demo, 'Forks branch the chat’s own event log, so they sync and merge like any other branch');
      await demo.sleep({ ms: 8_000 });
    },
  },
];

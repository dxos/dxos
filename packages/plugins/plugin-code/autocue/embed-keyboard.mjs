//
// Copyright 2026 DXOS.org
//

/**
 * A spec read with the keyboard alone. Arrowing through the text stops on each feature's section, which is then
 * selected and ringed; Enter edits its name and Escape selects it again. The arrows go on to the text or the next
 * section, Alt with Up or Down moves a selected section, and Escape returns to the text after it.
 *
 * @mdl packages/plugins/plugin-code/PLUGIN.mdl test QA-6
 * @app storybook-react, narrowed to plugin-code, on :9009
 *
 *   DX_STORIES=plugins/plugin-code VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve-nodeps
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --out /tmp/demo \
 *     --url 'http://localhost:9009/iframe.html?id=plugins-plugin-code-containers-featureembeds--sample&viewMode=story'
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/demo.webm --out /tmp/demo/demo-trimmed.webm \
 *     --duration off --max-static 3 --caption-hold 4
 */

const STORYBOOK = 'http://localhost:9009';
const SUBTITLE = 'from plugin-code/PLUGIN.mdl QA-6';
const STORY = `${STORYBOOK}/iframe.html?id=plugins-plugin-code-containers-featureembeds--sample&viewMode=story`;

/** Time to read a caption before the gesture it describes. */
const READ = 3_000;

/** Time to look at what a gesture changed. */
const LOOK = 2_500;

/** Time between presses of the same key, so each stop can be seen. */
const STEP = 1_200;

const SECTION = '[data-testid="feature-embed"]';

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, hold: READ });

/** Waits for the section whose name is `name` to be selected: focused itself, not a field inside it. */
const waitForSelected = (page, name) =>
  page.waitForFunction(
    ([selector, name]) =>
      document.activeElement?.matches(selector) &&
      document.activeElement.querySelector('input[data-testid="name"]')?.value === name,
    [SECTION, name],
    { timeout: 5_000 },
  );

/** Waits for the cursor to be in the text, on a line that shows `text` (an empty line when `text` is empty). */
const waitForText = (page, text) =>
  page.waitForFunction(
    (text) => {
      const node = document.getSelection()?.focusNode;
      const line = (node instanceof Element ? node : node?.parentElement)?.closest('.cm-line');
      const shown = line?.textContent.trim();
      return (
        document.activeElement?.classList.contains('cm-content') &&
        shown !== undefined &&
        (text === '' ? shown === '' : shown.includes(text))
      );
    },
    text,
    { timeout: 5_000 },
  );

const waitForNames = (page, expected) =>
  page.waitForFunction(
    ([selector, expected]) =>
      JSON.stringify(
        [...document.querySelectorAll(`${selector} input[data-testid="name"]`)]
          .slice(0, expected.length)
          .map((input) => input.value),
      ) === JSON.stringify(expected),
    [SECTION, expected],
    { timeout: 10_000 },
  );

/** Presses `key` once per stop, waiting for each before the next. */
const arrow = async (demo, key, stops) => {
  for (const stop of stops) {
    await demo.press({ key });
    await stop();
    await demo.sleep({ ms: STEP });
  }
};

const NAME = 'Accounts';
const RENAMED = 'Accounts (all providers)';
const NEXT = 'OAuth tokens';
const THIRD = 'Provider sync';

export const steps = [
  {
    name: 'Prep (off camera): load the story',
    setup: true,
    run: async ({ page }) => {
      // A cold preview bundles for a minute or more before its first story renders.
      await page.goto(STORY, { waitUntil: 'domcontentloaded', timeout: 180_000 });
      await page
        .locator(`${SECTION} input[data-testid="name"]`)
        .first()
        .waitFor({ state: 'visible', timeout: 180_000 });
      await waitForNames(page, [NAME, NEXT]);
    },
  },
  {
    name: 'Arrow onto a section',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Arrowing through embeds', subtitle: 'A spec, with the keyboard alone' });
      await caption(demo, 1, 'Each feature is a section embedded in the text');
      await demo.click({ selector: '.cm-line:has-text("Features")', label: 'End of the line' });
      await demo.press({ key: 'End' });
      await caption(demo, 1, 'Down stops on the section instead of skipping it');
      await arrow(demo, 'ArrowDown', [() => waitForText(page, ''), () => waitForSelected(page, NAME)]);
      await caption(demo, 1, 'Selected, the section rings; the cursor has left the text');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Edit it',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Enter goes into the section, to its name');
      await demo.press({ key: 'Enter' });
      await page.waitForFunction(
        () => {
          const input = document.activeElement;
          return (
            input?.getAttribute('data-testid') === 'name' &&
            input.selectionEnd - input.selectionStart === input.value.length
          );
        },
        undefined,
        { timeout: 5_000 },
      );
      await demo.sleep({ ms: 800 });
      await demo.press({ key: 'ArrowRight' });
      await page.waitForFunction(() => document.activeElement?.selectionStart === document.activeElement?.value.length);
      await demo.keys({ key: ' (all providers)' });
      await page.keyboard.type(' (all providers)', { delay: 120 });
      await demo.sleep({ ms: 1_000 });
      await caption(demo, 2, 'Escape comes back out, and the section is selected again');
      await demo.press({ key: 'Escape' });
      await waitForSelected(page, RENAMED);
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Arrow on through the spec',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Down goes on, a line or a section at a time');
      await arrow(demo, 'ArrowDown', [
        () => waitForText(page, ''),
        () => waitForSelected(page, NEXT),
        () => waitForText(page, ''),
        () => waitForSelected(page, THIRD),
      ]);
      await caption(demo, 3, 'Up comes back the same way');
      await arrow(demo, 'ArrowUp', [
        () => waitForText(page, ''),
        () => waitForSelected(page, NEXT),
        () => waitForText(page, ''),
        () => waitForSelected(page, RENAMED),
      ]);
    },
  },
  {
    name: 'Move a section',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Alt+Down moves the selected section, a line at a time');
      await demo.press({ key: 'Alt+ArrowDown' });
      await waitForSelected(page, RENAMED);
      await demo.sleep({ ms: STEP });
      await demo.press({ key: 'Alt+ArrowDown' });
      await waitForNames(page, [NEXT, RENAMED]);
      await waitForSelected(page, RENAMED);
      await caption(demo, 4, 'It is below "OAuth tokens" now, and still selected');
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Leave with Escape',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Escape goes back to the text, on the line after the section');
      await demo.press({ key: 'Escape' });
      await waitForText(page, '');
      await demo.sleep({ ms: LOOK });
    },
  },
];

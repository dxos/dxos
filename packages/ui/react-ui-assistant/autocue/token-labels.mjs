//
// Copyright 2026 DXOS.org
//

/**
 * Each block of a chat thread shows the tokens it consumes in a gutter beside it, once the "Show token counts"
 * setting is on: prompts, answer paragraphs and tool runs, including the blocks of a turn as it streams.
 *
 * @title Token labels
 * @mdl packages/plugins/plugin-assistant/PLUGIN.mdl test QA-5
 * @app storybook-react, narrowed to react-ui-assistant, as a static build:
 *
 *   cd tools/storybook-react && DX_STORIES=ui/react-ui-assistant VITE_DX_DISABLE_ANIMATIONS=true \
 *     npx storybook build --output-dir=out/tokens-demo
 *   python3 -m http.server 9019 --directory tools/storybook-react/out/tokens-demo
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --theme dark --out /tmp/demo \
 *     --url 'http://127.0.0.1:9019/iframe.html?id=ui-react-ui-assistant-components-chatthread--tokens&viewMode=story&args=showTokens:!false'
 */

const SUBTITLE = 'plugin-assistant/PLUGIN.mdl · QA-5';
const STORY_ID = 'ui-react-ui-assistant-components-chatthread--tokens';
const LABEL = '[data-testid="assistant.tokens"]';
const PROMPT = 'input[data-testid="assistant.prompt"]';

const caption = async (demo, value) => {
  await demo.caption({ value, subtitle: SUBTITLE });
  await demo.sleep({ ms: 2_000 });
};

/** Sets a story arg in place, as the Controls panel would, so the thread re-renders without a reload. */
const setArgs = (page, updatedArgs) =>
  page.evaluate(
    ([storyId, updatedArgs]) => window.__STORYBOOK_PREVIEW__.channel.emit('updateStoryArgs', { storyId, updatedArgs }),
    [STORY_ID, updatedArgs],
  );

/** Scrolls the thread by `dy` pixels in small steps, so the motion reads on camera. */
const scroll = async (page, dy) => {
  await page.mouse.move(640, 400);
  const steps = 12;
  for (let step = 0; step < steps; step++) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(600);
};

export const steps = [
  {
    name: 'Load the thread',
    setup: true,
    run: async ({ demo, page }) => {
      await demo.goto({});
      await page.locator('[data-testid="assistant.thread"]').waitFor({ timeout: 60_000 });
      await setArgs(page, { showTokens: false });
      await page.waitForTimeout(1_000);
      await scroll(page, -1_200);
      await demo.cut();
    },
  },
  {
    name: 'Labels are off by default',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Token labels', subtitle: 'Opt-in: Settings › Show token counts', hold: 3_600 });
      await caption(demo, 'Labels are off by default');
      if ((await page.locator(LABEL).count()) > 0) {
        throw new Error('labels shown while the setting is off');
      }
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Turn the labels on',
    run: async ({ demo, page }) => {
      await caption(demo, 'Turn on "Show token counts": each block shows its tokens beside it');
      await setArgs(page, { showTokens: true });
      await page.locator(LABEL).first().waitFor({ timeout: 10_000 });
      await demo.sleep({ ms: 2_500 });
      await scroll(page, 500);
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Labels follow a streaming turn',
    run: async ({ demo, page }) => {
      await caption(demo, 'Send a prompt: each block is labelled as it streams in');
      await demo.clearCaption();
      await demo.type({ selector: PROMPT, value: 'Find the spec for mdl in the dxos repo', delay: 50 });
      await demo.press({ key: 'Enter' });
      // The input names the turn's state: "Answering…" while it streams, "Ask something…" once it settles.
      await page.locator('input[placeholder="Answering…"]').waitFor({ timeout: 10_000 });
      await page.locator('input[placeholder="Ask something…"]').waitFor({ timeout: 120_000 });
      await caption(demo, 'The prompt, the tool run and each answer block carry an estimate');
      await demo.sleep({ ms: 2_000 });
    },
  },
  {
    name: 'Close',
    run: async ({ demo }) => {
      await caption(demo, 'Counts are estimated per block; provider usage covers a whole request');
      await demo.sleep({ ms: 8_000 });
    },
  },
];

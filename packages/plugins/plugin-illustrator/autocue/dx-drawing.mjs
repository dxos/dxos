//
// Copyright 2026 DXOS.org
//

/**
 * Lay out a diagram from the terminal with `dx drawing`, re-flow it after an edit, and import the SVG into a space
 * as an editable drawing.
 *
 * @mdl packages/plugins/plugin-illustrator/PLUGIN.mdl test QA-3
 * @app the autocue terminal stage on :4180, running a shell in a scratch directory
 *
 *   moon run cli:build                                 # dx runs under bun from the built workspace
 *   mkdir -p /tmp/dx-demo/work
 *   node .agents/skills/autocue/scripts/terminal/stage.mjs --port 4180 --cwd /tmp/dx-demo/work \
 *     --init packages/plugins/plugin-illustrator/autocue/dx-drawing.sh
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:4180 --out /tmp/dx-demo \
 *     --ready 'body[data-ready=true]' --settle 500 --theme light --overlay off
 *
 * Produce the cut with the Composer intro and a narrated voice-over:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/dx-demo/session.webm --out dx-drawing.webm \
 *     --ident composer --voiceover steps --mp4 --name plugin-illustrator-cli --duration 45-60
 *
 * The diagram is `pipeline.dx`, the path `dx drawing` itself takes; every node's `ref` names the module it stands for.
 */

/** A beat for the viewer after output lands. */
const BEAT = 1_600;

/** Keystroke delay: quick enough to keep the take short, slow enough to read. */
const TYPING = 32;

/** Types a command into the terminal and waits for the shell to print its next prompt. */
const sh = async (page, command, { timeout = 120_000, beat = BEAT } = {}) => {
  const before = await page.evaluate(() => window.stage.prompts);
  await page.locator('[data-testid="stage.terminal"] textarea').focus();
  await page.keyboard.type(command, { delay: TYPING });
  await page.waitForTimeout(250);
  await page.keyboard.press('Enter');
  await page.waitForFunction((count) => window.stage.prompts > count, before, { timeout });
  await page.waitForTimeout(beat);
};

/** Types a multi-line heredoc, one line per Enter, as a person pasting it would see it echoed. */
const heredoc = async (page, lines) => {
  for (const line of lines) {
    await page.keyboard.type(line, { delay: TYPING });
    await page.keyboard.press('Enter');
  }
};

/** The rendered SVG shown in the preview pane, by file name. */
const previewing = (page, name) =>
  page.waitForFunction(
    (name) =>
      document.getElementById('preview-name')?.textContent === name &&
      !!document.querySelector('[data-testid="stage.preview.image"]'),
    name,
    { timeout: 30_000 },
  );

export const steps = [
  {
    name: 'Prep (off camera): wait for the shell, set the title',
    setup: true,
    run: async ({ demo, page }) => {
      // `dx-drawing.sh` provisions the profile before the first prompt, which the stage clears from the screen.
      await page.waitForFunction(() => window.stage.prompts > 0, undefined, { timeout: 180_000 });
      await demo.caption({
        value: 'Diagrams as code',
        subtitle: 'dx drawing: the DXOS illustrator, from your terminal',
      });
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'Show the diagram source',
    narration: 'A diagram is a few lines of text: boxes, groups and how they relate. No coordinates.',
    run: async ({ page }) => {
      await sh(page, 'cat pipeline.dx', { beat: 3_500 });
    },
  },
  {
    name: 'Render it',
    narration:
      'dx drawing render lays it out: it places the boxes, routes every arrow, and reports crossings and bends.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Laid out in seconds',
        subtitle: 'Placed, routed and scored by the semantic layout engine',
      });
      await sh(page, 'clear && dx drawing render pipeline.dx', { beat: 0 });
      await previewing(page, 'pipeline.dx.svg');
      await page.waitForTimeout(3_500);
    },
  },
  {
    name: 'Edit and re-render',
    narration: 'Add three lines and render again. The whole layout re-flows, still with zero crossings.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Edit the text; the layout re-flows', subtitle: 'No dragging boxes around' });
      // Cleared first, on its own: a `clear` in the heredoc's command line runs after the typed lines and wipes them.
      await sh(page, 'clear', { beat: 200 });
      const before = await page.evaluate(() => window.stage.prompts);
      await heredoc(page, [
        'cat >> pipeline.dx <<EOF',
        'node Space "ECHO space"',
        'node Edge "EDGE"',
        'node Composer "Composer"',
        'edge Svg -> Space "dx drawing import"',
        'edge Space -> Edge "sync"',
        'edge Edge -> Composer',
        'EOF',
      ]);
      await page.waitForFunction((count) => window.stage.prompts > count, before, { timeout: 10_000 });
      const shown = await page.evaluate(() => window.stage.previews);
      await sh(page, 'dx drawing render pipeline.dx', { beat: 0 });
      await page.waitForFunction((count) => window.stage.previews > count, shown, { timeout: 30_000 });
      await page.waitForTimeout(4_000);
    },
  },
  {
    name: 'Import it into the space',
    narration:
      'The SVG is still a picture anywhere, but it also carries the drawing. Import it, and it is an object in your space.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The SVG is the drawing',
        subtitle: 'Import it into a space and edit it in Composer',
      });
      await sh(page, 'clear && dx drawing import pipeline.dx.svg', { beat: 1_200 });
      await sh(page, 'dx drawing list', { beat: 1_000 });
    },
  },
  {
    name: 'Hold the result',
    narration:
      'Local-first: the drawing lives in your space on this machine, syncs through EDGE, and people and agents edit the same object.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Local-first diagrams', subtitle: 'dx drawing render, import, list and export' });
      await page.waitForTimeout(9_000);
    },
  },
];

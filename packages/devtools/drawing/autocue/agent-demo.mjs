//
// Copyright 2026 DXOS.org
//

/**
 * drawing.sh, agent first: Claude Code with the drawing skill diagrams a sample repo, changes the diagram on
 * request, and imports it into a DXOS space. Every step is the real agent; nothing is replayed.
 *
 * @mdl packages/devtools/drawing/DRAWING.mdl test QA-1
 * @app the autocue terminal stage on :4180, running a shell in an empty scratch directory
 *
 *   moon run drawing:build cli:build
 *   mkdir -p /tmp/drawing-demo/work
 *   node .agents/skills/autocue/scripts/terminal/stage.mjs --port 4180 --cwd /tmp/drawing-demo/work \
 *     --init packages/devtools/drawing/autocue/agent-demo.sh
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:4180 \
 *     --out /tmp/drawing-demo --ready 'body[data-ready=true]' --settle 500 --theme light --overlay off
 *
 * Cut:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/drawing-demo/session.webm \
 *     --out drawing-agent.webm --ident composer --mp4 --name drawing-sh --duration 60-120
 *
 * Needs a signed-in `claude` on PATH. Step captions use the driver's banner, like every autocue demo.
 */

const TYPING = 28;

/** The terminal's visible text: xterm renders rows as DOM, so this is what the viewer sees. */
const screen = (page) =>
  page.evaluate(() => document.querySelector('[data-testid="stage.terminal"] .xterm-rows')?.textContent ?? '');

const focus = (page) => page.locator('[data-testid="stage.terminal"] textarea').focus();

/** Types a shell command and waits for the next prompt. */
const sh = async (page, command, { timeout = 120_000, beat = 1_200 } = {}) => {
  const before = await page.evaluate(() => window.stage.prompts);
  await focus(page);
  await page.keyboard.type(command, { delay: TYPING });
  await page.keyboard.press('Enter');
  await page.waitForFunction((count) => window.stage.prompts > count, before, { timeout });
  await page.waitForTimeout(beat);
};

/** Waits for a condition on the screen text, polling. */
const until = async (page, predicate, { timeout = 60_000, every = 400 } = {}) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (predicate(await screen(page))) {
      return;
    }
    await page.waitForTimeout(every);
  }
  throw new Error(`timed out; screen ends with: ${(await screen(page)).slice(-400)}`);
};

/** Claude Code is working while it offers "esc to interrupt"; it is done once that has been gone a while. */
const agentIdle = async (page, { timeout = 360_000, quiet = 4_000 } = {}) => {
  await until(page, (text) => text.includes('esc to interrupt'), { timeout: 30_000 });
  const deadline = Date.now() + timeout;
  let idleSince;
  while (Date.now() < deadline) {
    const text = await screen(page);
    // A permission prompt would stall the take; the fixture's settings allow every command the skill runs.
    if (/Do you want to proceed\?/.test(text)) {
      throw new Error('Claude Code asked for permission; allow the command in fixtures/shop/.claude/settings.json.');
    }
    if (text.includes('esc to interrupt')) {
      idleSince = undefined;
    } else {
      idleSince ??= Date.now();
      if (Date.now() - idleSince > quiet) {
        return;
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error('Claude Code did not finish in time.');
};

/** Sends a message to Claude Code and waits for it to finish working. */
const ask = async (page, message) => {
  await focus(page);
  await page.keyboard.type(message, { delay: TYPING });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await agentIdle(page);
};

const previews = (page) => page.evaluate(() => window.stage.previews);

export const steps = [
  {
    name: 'Prep (off camera): pass Claude Code first-run screens, clear',
    setup: true,
    run: async ({ page }) => {
      await page.waitForFunction(() => window.stage.prompts > 0, undefined, { timeout: 240_000 });
      await focus(page);
      await page.keyboard.type('claude\n');
      // First run asks for a theme, shows a security note and asks to trust the folder; each takes Enter.
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const text = await screen(page);
        if (text.includes('? for shortcuts') && !/trust|Press Enter|text style/i.test(text)) {
          break;
        }
        if (/text style|Press Enter to continue|trust this folder|Yes, proceed|Yes, I trust/i.test(text)) {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1_500);
        } else {
          await page.waitForTimeout(500);
        }
      }
      await page.keyboard.type('/exit');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2_000);
      await sh(page, 'clear', { beat: 300 });
    },
  },
  {
    name: 'Install the skill',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Install the skill', subtitle: 'npx skills add dxos/dxos --skill drawing' });
      await sh(page, 'head -3 .claude/skills/drawing/SKILL.md', { beat: 3_000 });
    },
  },
  {
    name: 'Ask the agent for a diagram',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Ask your agent for a diagram',
        subtitle: 'It reads the code and writes a few lines of .dx; drawing lays them out',
      });
      await focus(page);
      await page.keyboard.type('claude', { delay: TYPING });
      await page.keyboard.press('Enter');
      await until(page, (text) => text.includes('? for shortcuts'), { timeout: 60_000 });
      const shown = await previews(page);
      await ask(page, 'Draw the architecture of this repo with the drawing skill. Save it as arch.dx.');
      await page.waitForFunction((count) => window.stage.previews > count, shown, { timeout: 30_000 });
      await page.waitForTimeout(5_000);
    },
  },
  {
    name: 'Ask for a change; the layout re-flows',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask for a change', subtitle: 'The agent edits the text; the layout re-flows' });
      const shown = await previews(page);
      await ask(page, 'Group Stripe and Postmark as "External services" and render it again.');
      await page.waitForFunction((count) => window.stage.previews > count, shown, { timeout: 30_000 });
      await page.waitForTimeout(5_000);
    },
  },
  {
    name: 'Put it in a Composer space',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Put it in a Composer space',
        subtitle: 'The .dx.svg carries its source; dx drawing import makes it a live drawing',
      });
      await ask(page, 'Import arch.dx.svg into my DXOS space.');
      await page.waitForTimeout(4_000);
    },
  },
  {
    name: 'Hold the result',
    narration: 'The drawing lives in a local-first space, syncs through EDGE, and people and agents edit it together.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'drawing.sh', subtitle: 'Diagrams your agent can draw' });
      await page.waitForTimeout(8_000);
    },
  },
];

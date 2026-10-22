//
// Copyright 2026 DXOS.org
//

/**
 * drawing.sh, agent first: Claude Code with the drawing skill diagrams a sample repo, changes the diagram on
 * request, and imports it into a DXOS space that a Composer in the browser has joined, where it opens as a
 * live drawing. Every step is the real agent; nothing is replayed. The agent's working stretches play fast.
 *
 * @mdl packages/devtools/drawing/DRAWING.mdl test QA-1
 * @app the autocue terminal stage on :4180, running a shell in an empty scratch directory, and the
 *   `bundle-e2e` Composer (EDGE preview, which the demo's CLI profile also uses via `DX_LOCAL_DEV=1`) on :4173
 *
 *   moon run drawing:build cli:build composer-app:bundle-e2e
 *   (cd packages/apps/composer-app && pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173) &
 *   mkdir -p /tmp/drawing-demo/work
 *   node .agents/skills/autocue/scripts/terminal/stage.mjs --port 4180 --cwd /tmp/drawing-demo/work \
 *     --init packages/devtools/drawing/autocue/agent-demo.sh
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:4180 \
 *     --out /tmp/drawing-demo --ready 'body[data-ready=true]' --settle 500 --theme light --overlay off
 *
 * Cut:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/drawing-demo/session.webm \
 *     --out drawing-agent.webm --ident composer --mp4 --name drawing-sh --duration off --max-static 2.5 --caption-hold 4
 *
 * Needs a signed-in `claude` on PATH. Step captions use the driver's banner, like every autocue demo.
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPING = 28;

/** How much faster the agent's working stretches play: the result is the demo, not the spinner. */
const FAST = 12;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const COMPOSER = 'http://127.0.0.1:4173';
const PROFILE = 'autocue-drawing-sh';

/** Diagrams already in the repo, each drawn by the same layout engine, for the closing montage. */
const MONTAGE = [
  'packages/plugins/plugin-canvas/docs/diagrams/composer.dx',
  'packages/plugins/plugin-illustrator/src/components/testing/relations.dx',
  'packages/plugins/plugin-agent/docs/diagrams/discord-agents.dx',
  'packages/plugins/plugin-canvas/docs/diagrams/edge-router.dx',
  'packages/plugins/plugin-illustrator/src/components/testing/process.dx',
  'packages/plugins/plugin-canvas/docs/diagrams/composer-data.dx',
  'packages/plugins/plugin-canvas/docs/diagrams/edge-hub.dx',
  'packages/plugins/plugin-agent/docs/diagrams/brain-flows.dx',
];
const MONTAGE_DIR = '/tmp/drawing-demo-montage';

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
  const deadline = Date.now() + timeout;
  let idleSince;
  // Until the turn is seen working, idle may only mean it has not started, so it must stay idle longer.
  let worked = false;
  while (Date.now() < deadline) {
    const text = await screen(page);
    // The fixture's settings allow the commands the skill asks for; if the agent runs anything else, answer the
    // prompt as the person at the keyboard would ("1. Yes"), on camera.
    if (/Do you want to proceed\?/.test(text)) {
      await page.keyboard.press('1');
      await page.waitForTimeout(800);
      idleSince = undefined;
      continue;
    }
    if (text.includes('esc to interrupt') || !ready(text)) {
      worked = true;
      idleSince = undefined;
    } else {
      idleSince ??= Date.now();
      if (Date.now() - idleSince > (worked ? quiet : quiet * 4)) {
        return;
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error('Claude Code did not finish in time.');
};

/** Sends a message to Claude Code and waits for it to finish working, which plays fast in the cut. */
const ask = async (page, demo, message) => {
  await focus(page);
  await page.keyboard.type(message, { delay: TYPING });
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1_500);
  await demo.speed({ factor: FAST });
  try {
    await agentIdle(page, { quiet: 2_500 });
  } finally {
    await demo.speed({ factor: 1 });
  }
};

/** Claude Code's input box is up and waiting: its footer shows the permission-mode hint. */
const ready = (text) => /shift\+tab to cycle|\? for shortcuts/.test(text);

const previews = (page) => page.evaluate(() => window.stage.previews);

export const steps = [
  {
    name: 'Prep (off camera): pass Claude Code first-run screens, join the space from Composer, clear',
    setup: true,
    run: async ({ demo, page }) => {
      await page.waitForFunction(() => window.stage.prompts > 0, undefined, { timeout: 240_000 });

      // The montage's diagrams, rendered by this checkout's CLI.
      mkdirSync(MONTAGE_DIR, { recursive: true });
      for (const file of MONTAGE) {
        const out = path.join(MONTAGE_DIR, `${path.basename(file, '.dx')}.svg`);
        execFileSync(
          process.execPath,
          [path.join(ROOT, 'packages/devtools/drawing/bin/drawing.js'), 'render', '--plain', '-o', out, file],
          { cwd: ROOT },
        );
      }

      await joinFromComposer(page);

      await focus(page);
      await page.keyboard.type('claude\n');
      // First run asks for a theme, shows a security note and asks to trust the folder; each takes Enter.
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const text = await screen(page);
        if (ready(text) && !/trust this folder|Press Enter|text style/i.test(text)) {
          break;
        }
        if (text.includes('Yes, I trust this folder')) {
          // The trust dialog defaults to "No, exit".
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(300);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1_500);
        } else if (/text style|Press Enter to continue/i.test(text)) {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1_500);
        } else {
          await page.waitForTimeout(500);
        }
      }
      const prompts = await page.evaluate(() => window.stage.prompts);
      await page.keyboard.type('/exit');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      // Claude prints its resume hint as it exits; clear only once the shell prompt is back after it.
      await page.waitForFunction((count) => window.stage.prompts > count, prompts, { timeout: 30_000 });
      await page.waitForTimeout(1_500);
      await sh(page, 'clear', { beat: 500 });
      // Setup runs while the recorder is on; drop it so the take opens on the clean prompt.
      await demo.cut();
    },
  },
  {
    name: 'Ask the agent for a diagram',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Ask your agent for a diagram',
        subtitle: 'With the drawing skill installed: npx skills add dxos/dxos --skill drawing',
      });
      await focus(page);
      await page.keyboard.type('claude', { delay: TYPING });
      await page.keyboard.press('Enter');
      await until(page, ready, { timeout: 60_000 });
      await page.waitForTimeout(1_000);
      const shown = await previews(page);
      await ask(page, demo, 'Draw the architecture of this repo with the drawing skill. Save it as arch.dx.');
      await page.waitForFunction((count) => window.stage.previews > count, shown, { timeout: 30_000 });
      await demo.caption({
        value: 'It reads the code, writes a few lines of .dx, and drawing lays them out',
        subtitle: 'No coordinates, no SVG by hand: the report of crossings and bends tells it what to fix',
      });
      await page.waitForTimeout(7_000);
    },
  },
  {
    name: 'The source travels inside the SVG',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The SVG carries its source',
        subtitle: 'An image anywhere, and the .dx text inside it: drawing source prints it back',
      });
      const prompts = await page.evaluate(() => window.stage.prompts);
      await focus(page);
      await page.keyboard.type('/exit', { delay: TYPING });
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForFunction((count) => window.stage.prompts > count, prompts, { timeout: 30_000 });
      await sh(page, 'clear', { beat: 300 });
      await sh(page, 'drawing source arch.dx.svg', { beat: 7_000 });
    },
  },
  {
    name: 'Open it in Composer and move the boxes',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Open it in Composer',
        subtitle: 'dx drawing import adds it to a local-first space, synced through EDGE',
      });
      await sh(page, 'dx drawing import arch.dx.svg', { beat: 2_500 });
      await openInComposer({ demo, page });
    },
  },
  {
    name: 'drawing.sh',
    narration: 'Every one of these was written as a few lines of text and laid out by drawing.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'drawing.sh', subtitle: 'Diagrams your agent can draw' });
      await montage(page);
    },
  },
];

/**
 * Joins the CLI profile's space from a Composer in this browser context, off camera: `dx space share` hosts
 * the invitation, and the code and secret it prints go where a person would paste them.
 */
const joinFromComposer = async (page) => {
  // A space created moments ago can take a while to reach EDGE, so the first join may find nothing.
  for (let attempt = 1; ; attempt++) {
    try {
      return await joinOnce(page);
    } catch (error) {
      if (attempt >= 3) {
        throw error;
      }
      await page.waitForTimeout(20_000);
    }
  }
};

const joinOnce = async (page) => {
  const share = spawn(path.join(ROOT, 'packages/devtools/cli/bin/dx'), ['space', 'share'], {
    env: { ...process.env, DX_PROFILE: PROFILE, DX_LOCAL_DEV: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  share.stdout.on('data', (chunk) => (output += chunk));
  share.stderr.on('data', (chunk) => (output += chunk));
  const exited = new Promise((resolve) => share.on('exit', resolve));
  let composer;
  try {
    const deadline = Date.now() + 120_000;
    while (!/Invitation:\s*\S+/.test(output) && share.exitCode === null && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const invitation = /Invitation:\s*(\S+)/.exec(output)?.[1];
    const secret = /Secret:\s*(\d+)/.exec(output)?.[1];
    if (!invitation || !secret) {
      throw new Error(`dx space share printed no invitation: ${output.slice(-400)}`);
    }
    composer = await page.context().newPage();
    await composer.goto(`${COMPOSER}/?spaceInvitationCode=${invitation}`);
    const code = composer.getByTestId('space-auth-code-input').locator('input').first();
    await code.waitFor({ timeout: 120_000 });
    await code.click();
    await composer.keyboard.type(secret, { delay: 60 });
    await composer.getByTestId('space-invitation-authenticator-next').click();
    const status = await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 120_000)),
    ]);
    if (status !== 0) {
      throw new Error(`dx space share ended with ${status}: ${output.slice(-400)}`);
    }
    await composer.getByTestId('spacePlugin.spaceHome').first().waitFor({ timeout: 120_000 });
    if (
      await composer
        .getByText('Not Found', { exact: true })
        .isVisible()
        .catch(() => false)
    ) {
      throw new Error('the joined space has not reached Composer yet');
    }
    await closeHelp(composer);
    // Let the joined space settle in Composer before the page that holds it goes away.
    await composer.waitForTimeout(5_000);
  } finally {
    await composer?.close();
    share.kill();
  }
};

/** First run opens the Help companion beside every plank; it is not part of the story. */
const closeHelp = async (page) => {
  const close = page.getByTestId('plankHeading.closeCompanion').first();
  if (await close.isVisible().catch(() => false)) {
    await close.click({ timeout: 10_000 }).catch(() => {});
  }
};

/**
 * Switches the recording to Composer, where the imported drawing has synced into the joined space, opens it,
 * turns it into an editable Canvas drawing, and moves two boxes: the arrows stay attached.
 */
const openInComposer = async ({ demo, page }) => {
  // Composer's boot is a spinner, not content.
  await demo.speed({ factor: FAST });
  await page.goto(COMPOSER);
  // Composer reopens the space with no plank; its home lists what was added recently.
  await page.getByTestId('spacePlugin.spaceHome').first().waitFor({ timeout: 180_000 });
  await page.getByTestId('spacePlugin.spaceHome').first().click();
  await page.getByText('arch', { exact: true }).first().waitFor({ timeout: 180_000 });
  await closeHelp(page);
  await demo.speed({ factor: 1 });
  await page.waitForTimeout(1_500);
  await demo.click({ text: 'arch', exact: true });
  await page.locator('[data-testid="deck.plank"] svg text').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(3_000);

  await demo.caption({
    value: 'Edit it on a Canvas',
    subtitle: 'The picture becomes boxes and links you can move; the arrows stay attached',
  });
  await demo.click({ selector: '[data-testid="deck.plank"] >> role=button[name="arch"] >> nth=0' });
  await page.waitForTimeout(900);
  await demo.click({ selector: '[data-testid="illustratorPlugin.convert.canvas"]' });
  await page.locator('[data-node-id]').first().waitFor({ timeout: 60_000 });
  // The inspectors dock beside the canvas; floated, the drawing gets the whole plank.
  await page
    .getByTestId('dock-close')
    .click({ timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(2_500);

  // The two smallest labelled nodes are boxes rather than group frames; move one down and one up.
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('[data-node-id]')]
      .map((node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x: x + width / 2, y: y + height / 2, area: width * height, text: node.textContent?.trim() ?? '' };
      })
      .filter(({ text, area }) => text.length > 0 && area > 0)
      .sort((left, right) => left.area - right.area),
  );
  for (const [index, box] of boxes.slice(0, 2).entries()) {
    const offset = index === 0 ? { x: -60, y: 140 } : { x: 90, y: -110 };
    await demo.drag({ fromXY: box, toXY: { x: box.x + offset.x, y: box.y + offset.y }, steps: 45, stepDelay: 22 });
    await page.waitForTimeout(1_800);
  }
  await page.mouse.click(page.viewportSize().width - 400, 120);
  await demo.caption({
    value: 'A live drawing in a local-first space',
    subtitle: 'Synced through EDGE, so people and agents keep working on it together',
  });
  await page.waitForTimeout(5_000);
};

/** Flashes the montage, one diagram at a time, over the whole window. */
const montage = async (page) => {
  const svgs = MONTAGE.map((file) => readFileSync(path.join(MONTAGE_DIR, `${path.basename(file, '.dx')}.svg`), 'utf8'));
  await page.evaluate(() => {
    const stage = document.createElement('div');
    stage.id = '__montage__';
    stage.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;background:#fff;display:flex;align-items:center;justify-content:center;padding:48px 64px 120px';
    document.body.appendChild(stage);
  });
  for (const svg of svgs) {
    await page.evaluate((markup) => {
      const stage = document.getElementById('__montage__');
      stage.innerHTML = markup;
      const element = stage.querySelector('svg');
      element.removeAttribute('width');
      element.removeAttribute('height');
      element.style.cssText = 'width:100%;height:100%;color:#262626';
    }, svg);
    await page.waitForTimeout(1_300);
  }
  await page.waitForTimeout(1_500);
};

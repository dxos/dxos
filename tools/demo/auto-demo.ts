#!/usr/bin/env tsx
/**
 * Fully automated 3-minute demo. Connects via CDP, drives everything.
 *
 * Prerequisites:
 *   1. `pnpm demo` running (Chromium open, CDP on 9222, "Demo is live")
 *   2. Slack desktop app open
 *
 * Usage:
 *   cd tools/demo && pnpm exec tsx auto-demo.ts
 *
 * Hit Enter when prompted → start your screen recording → script drives
 * the entire demo: sidebar clicks, chat messages, window switches,
 * Slack interactions, PR merge, everything.
 */

import { execSync } from 'node:child_process';

import { chromium, type Page } from 'playwright';

// ── timing ──────────────────────────────────────────────────────────────────

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── window switching (macOS) ────────────────────────────────────────────────

const focus = (app: string) => {
  try {
    if (app === 'Slack') {
      execSync('open -a Slack', { stdio: 'ignore' });
    } else {
      execSync(`osascript -e 'tell application "${app}" to activate'`, { stdio: 'ignore' });
    }
  } catch {
    // swallow
  }
};

// ── sidebar navigation ─────────────────────────────────────────────────────

const expandCollection = async (page: Page, name: string) => {
  // Find the row containing this name, click its toggle if it says "Click to open"
  const row = page.locator(`[data-testid="spacePlugin.object"]:has-text("${name}")`).first();
  const toggle = row.locator('[data-testid="treeItem.toggle"]');
  const toggleText = await toggle.textContent().catch(() => '');
  if (toggleText?.includes('open')) {
    await toggle.click();
    await pause(1000);
  }
};

const clickItem = async (page: Page, name: string) => {
  // Click the heading button that contains this text
  const heading = page.locator(`[data-testid="treeItem.heading"]:has-text("${name}")`).first();
  if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
    await heading.click();
    await pause(2000);
    return true;
  }
  console.log(`  ⚠ item "${name}" not visible`);
  return false;
};

// ── chat interaction ────────────────────────────────────────────────────────

const chatAndWait = async (page: Page, text: string, prev: string): Promise<string> => {
  // Try typing in the UI editor first
  const editor = page.locator('[contenteditable="true"]').last();
  if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
    await editor.click();
    await editor.pressSequentially(text, { delay: 25 });
    await pause(300);
    await page.keyboard.press('Enter');
  } else {
    await page.evaluate((m: string) => (globalThis as any).__DEMO__.chat(m), text);
  }
  // Wait for response
  for (let i = 0; i < 40; i++) {
    await pause(1000);
    const resp = await page.evaluate(() => (globalThis as any).__DEMO__.lastResponse()).catch(() => '');
    if (resp && resp !== prev && resp.length > 10) {
      return resp;
    }
  }
  return prev;
};

// ── Slack API ───────────────────────────────────────────────────────────────

const postSlack = async (page: Page, text: string) => {
  return page.evaluate(async (text: string) => {
    const token = globalThis.localStorage?.getItem('SLACK_BOT_TOKEN');
    const channel = globalThis.localStorage?.getItem('SLACK_NUDGE_CHANNEL') ??
      globalThis.localStorage?.getItem('SLACK_CHANNELS')?.split(',')[0];
    if (!token || !channel) {
      return false;
    }
    const body = new URLSearchParams({ token, channel, text });
    const resp = await fetch('https://slack.com/api/chat.postMessage', { method: 'POST', body });
    const data = (await resp.json()) as { ok: boolean };
    return data.ok;
  }, text);
};

const getBotId = async (page: Page): Promise<string> => {
  return page.evaluate(async () => {
    const token = globalThis.localStorage?.getItem('SLACK_BOT_TOKEN');
    if (!token) {
      return '';
    }
    const body = new URLSearchParams({ token });
    const resp = await fetch('https://slack.com/api/auth.test', { method: 'POST', body });
    const data = (await resp.json()) as { ok: boolean; user_id?: string };
    return data.user_id ?? '';
  });
};

// ── narration ───────────────────────────────────────────────────────────────

const act = (label: string) => console.log(`\n${'━'.repeat(50)}\n🎬 ${label}\n${'━'.repeat(50)}`);
const beat = (label: string) => console.log(`  → ${label}`);

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════');
  console.log(' AUTOMATED DEMO');
  console.log(' Start Cmd-Shift-5, then press Enter here');
  console.log('══════════════════════════════════════════');
  await new Promise<void>((r) => { process.stdin.once('data', () => r()); });

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0]?.pages()?.find((p) => p.url().includes('5173'));
  if (!page) {
    console.error('No Composer page');
    process.exit(1);
  }

  let lastResp = '';
  const botId = await getBotId(page);

  // ═════════════════════════════════════════════════════════════════════════
  // ACT 1 — Morning briefing (0:00–0:25)
  // ═════════════════════════════════════════════════════════════════════════

  act('ACT 1: Morning briefing');
  focus('Google Chrome for Testing');
  await pause(2000);

  beat('Expanding Widgets Team demo collection');
  await expandCollection(page, 'Widgets Team demo');
  await pause(2000);

  beat('Clicking Morning briefing');
  await clickItem(page, 'Morning briefing');
  await pause(6000);

  // ═════════════════════════════════════════════════════════════════════════
  // ACT 2 — Cross-surface conversation (0:25–1:15)
  // ═════════════════════════════════════════════════════════════════════════

  act('ACT 2: Cross-surface conversation');

  beat('Opening Slack chat in Composer');
  await clickItem(page, 'Slack #');
  await pause(3000);

  beat('Asking agent: what cards are in progress?');
  lastResp = await chatAndWait(page, 'what cards are in progress and what should we focus on?', lastResp);
  console.log('  Agent:', lastResp.slice(0, 120));
  await pause(4000);

  beat('Switching to Slack');
  focus('Slack');
  await pause(4000);

  beat('Posting @mention in Slack');
  await postSlack(page, `<@${botId}> give me a quick standup summary`);
  await pause(3000);

  beat('Waiting for agent reply in Slack (20s)');
  await pause(20000);

  beat('Switching back to Composer — same conversation');
  focus('Google Chrome for Testing');
  await pause(2000);
  await clickItem(page, 'Slack #');
  await pause(5000);

  // ═════════════════════════════════════════════════════════════════════════
  // ACT 3 — Real actions (1:15–2:15)
  // ═════════════════════════════════════════════════════════════════════════

  act('ACT 3: Real actions — move card + PR nudge');

  beat('Asking agent to move a card');
  lastResp = await chatAndWait(page, 'move the widget dragging bug to done', lastResp);
  console.log('  Agent:', lastResp.slice(0, 120));
  await pause(4000);

  beat('Switching to Trello to verify');
  focus('Google Chrome');
  await pause(6000);

  beat('Back to Composer — triggering PR merge event');
  focus('Google Chrome for Testing');
  await pause(2000);

  await page.evaluate(() => (globalThis as any).__DEMO__.injectPrMerged());
  beat('PR merge injected, waiting for nudge (up to 30s)');
  for (let i = 0; i < 15; i++) {
    await pause(2000);
    const status = await page.evaluate(() => (globalThis as any).__DEMO__.status()).catch(() => null);
    if (status?.nudges?.length > 0) {
      console.log('  Nudge detected!');
      break;
    }
    if (i === 14) {
      console.log('  ⚠ No nudge after 30s');
    }
  }

  beat('Switching to Slack to show nudge');
  focus('Slack');
  await pause(6000);

  // ═════════════════════════════════════════════════════════════════════════
  // ACT 4 — Synthesis + plugin source (2:15–3:00)
  // ═════════════════════════════════════════════════════════════════════════

  act('ACT 4: Synthesis + plugin source');

  focus('Google Chrome for Testing');
  await pause(2000);

  beat('Opening Weekly update');
  await clickItem(page, 'Weekly update');
  await pause(6000);

  beat('Opening plugin-linear source');
  try {
    execSync(
      'open -a "Cursor" /Users/chad/src/dxos/.claude/worktrees/composer-agent/packages/plugins/plugin-linear/src/LinearPlugin.tsx 2>/dev/null || ' +
      'open -a "Visual Studio Code" /Users/chad/src/dxos/.claude/worktrees/composer-agent/packages/plugins/plugin-linear/src/LinearPlugin.tsx 2>/dev/null || true',
      { stdio: 'ignore', shell: '/bin/bash' },
    );
  } catch {
    // swallow
  }
  await pause(6000);

  beat('Final frame: back to Composer');
  focus('Google Chrome for Testing');
  await pause(4000);

  console.log('\n══════════════════════════════════════════');
  console.log(' DONE — stop your screen recording (Esc)');
  console.log('══════════════════════════════════════════');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

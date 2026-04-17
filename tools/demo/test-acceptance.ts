#!/usr/bin/env tsx
/**
 * Shared-agent acceptance tests. Connects to the running demo via CDP
 * (port 9222) and exercises every tool + edge case.
 *
 * Prerequisites:
 *   - vite on :5173
 *   - `pnpm demo` completed (Chromium open with CDP on 9222)
 *   - Slack mirror has created at least one SlackChatLink
 *
 * Usage:
 *   cd tools/demo && pnpm exec tsx test-acceptance.ts
 */

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0]?.pages()?.find((p) => p.url().includes('5173'));
  if (!page) {
    console.error('no page at localhost:5173');
    process.exit(1);
  }

  const chat = async (msg: string): Promise<string> => {
    await page.evaluate((m: string) => (globalThis as any).__DEMO__.chat(m), msg);
    await page.waitForTimeout(25000);
    return page.evaluate(() => (globalThis as any).__DEMO__.lastResponse());
  };

  let pass = 0;
  let fail = 0;
  const test = async (name: string, input: string, check: (r: string) => boolean) => {
    process.stdout.write(`TEST: ${name}… `);
    const resp = await chat(input);
    const ok = check(resp);
    console.log(ok ? '✓' : '✗');
    if (!ok) {
      console.log('  Expected check to pass. Got:', resp.slice(0, 200));
    }
    if (ok) {
      pass++;
    } else {
      fail++;
    }
  };

  // --- Query tools ---
  await test('query all cards', 'list every trello card and its current list', (r) =>
    r.includes('Color picker') && r.includes('Widget dragging'));

  await test('query specific list', 'which cards are in backlog?', (r) =>
    r.toLowerCase().includes('backlog'));

  await test('query PRs', 'what pull requests have been merged recently?', (r) =>
    r.includes('#') || r.toLowerCase().includes('merge'));

  await test('query granola', 'are there any meeting notes?', (r) =>
    r.length > 20);

  // --- Action tools ---
  await test('move card exact', 'move Dark mode to In Progress', (r) =>
    r.toLowerCase().includes('moved') || r.toLowerCase().includes('dark mode'));

  await test('move card fuzzy', 'move the perf card to done', (r) =>
    r.toLowerCase().includes('moved') || r.toLowerCase().includes('perf'));

  await test('move card back', 'move Dark mode back to Backlog', (r) =>
    r.toLowerCase().includes('moved') || r.toLowerCase().includes('backlog'));

  await test('create card', 'create a card called E2E test card in Backlog', (r) =>
    r.toLowerCase().includes('created') || r.toLowerCase().includes('e2e'));

  await test('post to slack', 'post to widgets-eng: acceptance test green', (r) =>
    r.toLowerCase().includes('posted') || r.toLowerCase().includes('widget'));

  // --- Memory / context ---
  await test('recall action', 'what did we just do with dark mode?', (r) =>
    r.toLowerCase().includes('dark mode') && r.length > 30);

  await test('cross-reference', 'which cards relate to accessibility?', (r) =>
    r.toLowerCase().includes('color picker') || r.toLowerCase().includes('a11y'));

  // --- Edge cases ---
  await test('nonexistent card', 'move the quantum computing card to done', (r) =>
    r.length > 20 && !r.toLowerCase().includes('moved "quantum'));

  await test('vague input', 'hey', (r) =>
    r.length > 10);

  await test('compound request', 'list cards in review and tell me which PRs relate to them', (r) =>
    r.length > 50);

  // --- Results ---
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`RESULTS: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  console.log(`${'═'.repeat(40)}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

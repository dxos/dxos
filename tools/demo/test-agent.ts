#!/usr/bin/env tsx
/**
 * Quick isolated test of the shared-agent. No full Composer UI needed.
 *
 * Usage (requires vite on :5173):
 *   cd tools/demo && pnpm exec tsx test-agent.ts "move the dragging bug to done"
 *   cd tools/demo && pnpm exec tsx test-agent.ts "what cards are in progress?"
 *   cd tools/demo && pnpm exec tsx test-agent.ts "post 'standup in 5' to widgets-eng"
 *
 * Loads a headless Chromium, navigates to Composer, waits for __DEMO__,
 * injects a user message into the Slack-linked chat's feed, waits for
 * the shared-agent to respond, prints the response, and exits.
 *
 * ~15s total on warm vite.
 */

import { chromium } from 'playwright';

const URL = 'http://localhost:5173';
const userMessage = process.argv[2];

if (!userMessage) {
  console.error('Usage: tsx test-agent.ts "your message here"');
  process.exit(1);
}

const main = async () => {
  console.log(`▶ Testing shared-agent with: "${userMessage}"`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Wait for app to load.
  console.log('  loading Composer…');
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(5_000);
      const ok = await page.evaluate(() => Boolean((globalThis as any).__DEMO__));
      if (ok) {
        console.log(`  __DEMO__ ready (attempt ${attempt})`);
        break;
      }
    } catch {
      // retry
    }
    if (attempt === 20) {
      console.error('✗ __DEMO__ never loaded');
      await browser.close();
      process.exit(1);
    }
  }

  // Bootstrap to ensure objects exist.
  console.log('  bootstrapping…');
  await page.evaluate(() => (globalThis as any).__DEMO__.bootstrap());

  // Wait for the shared-agent + mirror to start.
  await page.waitForTimeout(8_000);

  // Inject a user message into the first Slack-linked chat's feed.
  console.log(`  injecting message: "${userMessage}"`);
  const injected = await page.evaluate(async (text: string) => {
    const demo = (globalThis as any).__DEMO__;
    if (!demo) {
      return { ok: false, error: 'no __DEMO__' };
    }
    // Find the SlackChatLink chat.
    const space = (globalThis as any).__DXOS__?.client?.spaces?.get?.()?.find?.(
      (s: any) => String(s?.state?.get?.()).includes('READY'),
    );
    if (!space) {
      return { ok: false, error: 'no space' };
    }
    // Dynamic import to avoid tsx issues.
    const echo = await import('/@fs/' + import.meta.url.replace(/.*@fs\//, '').replace(/test-agent.*/, '') +
      '../../packages/core/echo/echo/src/index.ts');
    // Simpler: use raw query.
    const allObjects = await space.db.query().run();
    const links = allObjects.filter((o: any) => o.__typename === 'org.dxos.type.slackChatLink');
    if (links.length === 0) {
      return { ok: false, error: 'no SlackChatLink — post something in #widgets-eng first so the mirror creates one' };
    }
    const link = links[0];
    const chat = link.chat?.target;
    if (!chat?.feed?.target) {
      return { ok: false, error: 'SlackChatLink has no chat with feed' };
    }
    const feedTarget = chat.feed.target;
    const { Feed, Obj } = await import('/@fs/' + import.meta.url.replace(/.*@fs\//, '').replace(/test-agent.*/, '') +
      '../../packages/core/echo/echo/src/index.ts');
    const queueDxn = Feed.getQueueDxn(feedTarget);
    if (!queueDxn) {
      return { ok: false, error: 'no queue DXN' };
    }
    const queue = space.queues.get(queueDxn);
    if (!queue) {
      return { ok: false, error: 'no queue' };
    }
    const { Message } = await import('/@fs/' + import.meta.url.replace(/.*@fs\//, '').replace(/test-agent.*/, '') +
      '../../packages/sdk/types/src/types/Message.ts');
    await queue.append([
      Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [{ _tag: 'text', text }],
      }),
    ]);
    return { ok: true, chatId: chat.id, chatName: chat.name };
  }, userMessage);

  if (!injected.ok) {
    console.error('✗ injection failed:', injected.error);
    await browser.close();
    process.exit(1);
  }
  console.log(`  injected into chat "${injected.chatName}" (${injected.chatId})`);

  // Wait for shared-agent to respond (polls every 3s, so ~6-10s).
  console.log('  waiting for agent response (up to 30s)…');
  for (let tick = 0; tick < 30; tick++) {
    await page.waitForTimeout(1_000);
    const logs = await page.evaluate(() => {
      const w = globalThis as any;
      return (w.__sharedAgentLogs ?? []) as string[];
    });
    // Also check if console has "shared-agent: responded".
    // Simpler: just wait 15s and then read the last message.
  }

  // Read the last assistant message from the chat feed.
  await page.waitForTimeout(15_000);
  const result = await page.evaluate(async () => {
    const space = (globalThis as any).__DXOS__?.client?.spaces?.get?.()?.find?.(
      (s: any) => String(s?.state?.get?.()).includes('READY'),
    );
    if (!space) {
      return { response: '(no space)' };
    }
    const allObjects = await space.db.query().run();
    const links = allObjects.filter((o: any) => o.__typename === 'org.dxos.type.slackChatLink');
    if (links.length === 0) {
      return { response: '(no link)' };
    }
    const chat = links[0].chat?.target;
    if (!chat?.feed?.target) {
      return { response: '(no feed)' };
    }
    const { Feed } = await import('/@fs/' + import.meta.url.replace(/.*@fs\//, '').replace(/test-agent.*/, '') +
      '../../packages/core/echo/echo/src/index.ts');
    const queueDxn = Feed.getQueueDxn(chat.feed.target);
    const queue = space.queues.get(queueDxn);
    if (!queue) {
      return { response: '(no queue)' };
    }
    const messages = await queue.queryObjects();
    const last = messages[messages.length - 1];
    if (last?.sender?.role !== 'assistant') {
      return { response: '(no assistant reply yet — agent may still be running)', lastRole: last?.sender?.role };
    }
    const text = (last.blocks ?? [])
      .filter((b: any) => b._tag === 'text')
      .map((b: any) => b.text)
      .join('\n');
    return { response: text };
  });

  console.log('\n──────────────────────────────────────────');
  console.log('Agent response:');
  console.log(result.response);
  console.log('──────────────────────────────────────────\n');

  await browser.close();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

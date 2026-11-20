//
// Copyright 2026 DXOS.org
//

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Kai on Discord, timed per message. A person mentions Kai in a channel of the DXOS Discord; Kai answers in a thread,
 * brainstorms an invented team offsite there, writes the plan into a document marked as a test, and DMs its link,
 * asks it to edit the document, and opens it from the DM in Composer. Every reply carries a badge with its latency, and a panel in the corner keeps
 * each message's latency on screen to the end.
 *
 * @title Kai on Discord
 * @mdl packages/plugins/plugin-agent/PLUGIN.mdl test QA-6
 * @app dev.composer.space on preview EDGE, with the preview Kai bot ("Kai Preview") in a channel of the DXOS Discord.
 *   Sign in to Discord and create a Composer identity bound to the bot once, in a manual session on the autocue
 *   profile; the take records from that profile, headless (add `--headed on` to watch it):
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --mode manual --url https://discord.com/login --out /tmp/demo
 *   node .agents/skills/autocue/scripts/driver.mjs --persist on --ready 'div[role="textbox"]' --out /tmp/demo
 *
 * The bot writes preview.composer.space links; the flow opens the same path on dev.composer.space, the Composer the
 * identity lives in.
 *
 * Each latency is the time between Discord's own timestamps (the `datetime` of each message): the person's message
 * and Kai's answer to it. They are also written to `<out>/latencies.json`, `out` being `DX_DEMO_OUT` (default
 * `/tmp/demo`), and logged as `[latency]`. Waits on Kai play fast-forwarded, with the speed shown.
 *
 * Progress (the thread, the document's link, Kai's DM) is saved to `<out>/discord-offsite.state.json` as the take
 * runs, so `run` with `from` picks up after the messages already sent instead of sending them again. Delete the file
 * for a new take.
 */

const GUILD = '837138313172353095';
const CHANNEL = '1494842957340086382';
const CHANNEL_URL = `https://discord.com/channels/${GUILD}/${CHANNEL}`;
const AGENT = 'Kai Preview';
const PERSON = 'mykola_vrmchk';
const DOC_TITLE = '[TEST] Driftwood offsite plan';

/** Mentions, written `{name}`, are picked from Discord's autocomplete when typed. */
const MESSAGES = {
  start: `{${AGENT}} [TEST] Brainstorm with me: we're planning a made-up team offsite called Driftwood, at a lake cabin in the Dolomites on March 12–14, for 10 people. What should we plan first?`,
  dayTwo: `{${AGENT}} Give me three ideas for day two that mix a morning hike with an afternoon hack session.`,
  budget: `{${AGENT}} The budget is 9,000 euros. What would you cut first if we run over?`,
  document: `{${AGENT}} Put this plan in a document titled "${DOC_TITLE}", and say at the top that it is a test made for a demo.`,
  dm: `{${AGENT}} DM {${PERSON}} the link to that document.`,
  edit: `{${AGENT}} Add a "Packing list" section to the document with five items.`,
};

/** One panel row per answer from Kai, numbered in the order asked, and the document's render in Composer. */
const LABELS = {
  start: '1. Where to start',
  dayTwo: '2. Ideas for day two',
  budget: '3. What to cut',
  document: '4. Write the document',
  dm: '5. DM the link',
  edit: '6. Add a packing list',
  render: 'Composer renders it',
};

/** Kai links to the Composer it runs beside; the identity the take opens it with lives on dev.composer.space. */
const toDevComposer = (url) => url.replace('://preview.composer.space/', '://dev.composer.space/');

/** Waits on Kai play this many times faster, with a badge saying so. */
const WAIT_SPEED = 6;

/** A live agent turn on EDGE takes seconds to a minute; a cold one, or one that writes a document, longer. */
const REPLY_TIMEOUT = 180_000;
/** Composer's first load of a document, from a cold tab, until Kai's edit shows. */
const RENDER_TIMEOUT = 120_000;
/** The closing beat: the finished result held on screen with every latency. */
const LINGER = 10_000;

const OUT = process.env.DX_DEMO_OUT ?? '/tmp/demo';
const STATE_FILE = path.join(OUT, 'discord-offsite.state.json');
const LATENCY_FILE = path.join(OUT, 'latencies.json');

const DOC_LINK = /https:\/\/[\w.-]*composer\.space\/w\/\S+/;

// Discord, by role and id.
const TEXTBOX = 'div[role="textbox"][contenteditable="true"]';
const MESSAGE = 'li[id^="chat-messages-"]';
const AUTOCOMPLETE_OPTION = '[role="listbox"] [role="option"]';
const DM_ENTRY = `a[aria-label*="${AGENT}"][href^="/channels/@me/"]`;
// The DM list and the DM's earlier history are the presenter's own; the take shows only what Kai sent in it. Added only to
// DM pages, since Discord rewrites the root element's attributes and a marker there does not last.
const PRIVACY_STYLE = `
  [data-list-id^="private-channels"] { visibility: hidden !important; }
  li[id^="chat-messages-"]:not(.autocue-keep) { display: none !important; }
  [role="separator"] { display: none !important; }
`;

// Composer.
const PLANK = '[data-testid="deck.plank"]';

/** Progress that outlives a `run`, so a take restarted from a later step finds the thread and the document. */
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
/** Every latency measured so far: `{ label, ms, messageId }`, in the order measured. */
const latencies = state.latencies ?? [];

const save = () => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify({ ...state, latencies }, null, 2));
  writeFileSync(LATENCY_FILE, JSON.stringify(latencies, null, 2));
};

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;

const waitFor = async (predicate, { timeout, what }) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await predicate();
    if (value) {
      return value;
    }
    if (Date.now() > deadline) {
      throw new Error(`timed out after ${seconds(timeout)} waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

/**
 * Draws the latency panel: every measured latency, and a live stopwatch for the wait in progress. It is page DOM, so
 * the recorder captures it, and is drawn again after each navigation. `running` is `{ label, since }` (epoch ms).
 */
const drawLatency = (page, running) =>
  page.evaluate(
    ({ rows, running }) => {
      const id = 'autocue-latency';
      let panel = document.getElementById(id);
      if (!panel) {
        panel = document.createElement('div');
        panel.id = id;
        Object.assign(panel.style, {
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: '2147483646',
          minWidth: '300px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(12, 12, 16, 0.86)',
          backdropFilter: 'blur(8px)',
          color: '#f4f4f5',
          font: '500 15px/1.5 ui-sans-serif, system-ui, sans-serif',
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        });
        document.body.appendChild(panel);
      }
      clearInterval(window.__autocueLatencyTimer);
      const row = (label, value, live) =>
        `<div style="display:flex;justify-content:space-between;gap:24px">` +
        `<span style="opacity:${live ? 1 : 0.8}">${label}</span>` +
        `<span style="color:${live ? '#fbbf24' : '#86efac'}">${value}</span></div>`;
      const render = () => {
        const body = rows.map(({ label, ms }) => row(label, `${(ms / 1000).toFixed(1)} s`, false));
        if (running) {
          body.push(row(running.label, `${((Date.now() - running.since) / 1000).toFixed(1)} s`, true));
        }
        panel.innerHTML =
          `<div style="font-weight:700;margin-bottom:6px;letter-spacing:0.02em">⏱ Kai latency</div>` +
          (body.length > 0 ? body.join('') : `<div style="opacity:0.6">Waiting for the first message…</div>`);
      };
      // Each answer carries its own latency next to its author, applied again whenever Discord re-renders the list.
      const badge = () => {
        for (const { ms, messageId } of rows) {
          const header = messageId && document.querySelector(`li[id$="-${messageId}"] h3`);
          if (!header || header.querySelector('.autocue-badge')) {
            continue;
          }
          const chip = document.createElement('span');
          chip.className = 'autocue-badge';
          chip.textContent = `⏱ ${(ms / 1000).toFixed(1)} s`;
          Object.assign(chip.style, {
            marginLeft: '10px',
            padding: '1px 8px',
            borderRadius: '6px',
            background: 'rgba(134, 239, 172, 0.16)',
            color: '#86efac',
            font: '600 12px/18px ui-sans-serif, system-ui, sans-serif',
            fontVariantNumeric: 'tabular-nums',
          });
          header.appendChild(chip);
        }
      };
      clearInterval(window.__autocueBadgeTimer);
      window.__autocueBadgeTimer = setInterval(badge, 300);
      render();
      badge();
      if (running) {
        window.__autocueLatencyTimer = setInterval(render, 100);
      }
    },
    { rows: latencies, running },
  );

const record = async (page, label, ms, messageId) => {
  latencies.push({ label, ms, messageId });
  save();
  console.log(`[latency] ${label}: ${seconds(ms)}`);
  await drawLatency(page);
};

/**
 * Each message in the open conversation, oldest first: its id, server time, author (Discord names it only on the first
 * of a run of messages from one author), the message it replies to, its own text and its links.
 */
const messages = (page) =>
  page.locator(MESSAGE).evaluateAll((items) => {
    let author = '';
    return items.map((item) => {
      const name = item.querySelector('h3 [id^="message-username-"], h3 [class*="username"]');
      if (name) {
        author = name.textContent.trim();
      }
      const time = item.querySelector('time[datetime]')?.getAttribute('datetime');
      const context = item.querySelector('[id^="message-reply-context-"]');
      const quoted = context?.querySelector('[id^="message-content-"]')?.id.split('-').pop();
      const own = [...item.querySelectorAll('[id^="message-content-"]')].filter((node) => !context?.contains(node));
      const links = [...item.querySelectorAll('a[href]')]
        .filter((anchor) => !context?.contains(anchor))
        .map((anchor) => anchor.href);
      return {
        id: item.id.split('-').pop(),
        at: time ? Date.parse(time) : undefined,
        author,
        replyTo: quoted,
        content: own.map((node) => node.textContent).join(' '),
        links,
      };
    });
  });

const fromAgent = (message) => message.author.includes(AGENT);
const hasDocLink = (message) => message.links.some((link) => DOC_LINK.test(link)) || DOC_LINK.test(message.content);

/**
 * Types `text` into the conversation's message box and sends it. Each `{name}` is picked from Discord's autocomplete,
 * since a typed name without it is plain text that pings no one, and Kai answers only a mention.
 */
const send = async ({ demo, page }, text) => {
  await demo.click({ selector: TEXTBOX, label: 'Message' });
  // A draft left by an earlier, failed attempt would be sent with this message.
  await demo.press({ key: 'ControlOrMeta+A', hud: false });
  await demo.press({ key: 'Backspace', hud: false });
  for (const part of text.split(/(\{[^}]+\})/).filter(Boolean)) {
    const name = part.startsWith('{') ? part.slice(1, -1) : undefined;
    if (!name) {
      // In short runs: a whole sentence at a typing pace outlasts the driver's per-gesture timeout.
      for (const chunk of part.match(/.{1,60}/gs)) {
        await demo.type({ selector: TEXTBOX, value: chunk, delay: 35 });
      }
      continue;
    }
    // A space ends Discord's autocomplete, so only the name's first word is typed and the option is picked by its
    // full name ("Kai Preview", not "Kai").
    await demo.type({ selector: TEXTBOX, value: `@${name.split(' ')[0]}`, delay: 35 });
    const option = page.locator(AUTOCOMPLETE_OPTION).filter({ hasText: name }).first();
    await option.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {
      throw new Error(`Discord offered no mention for @${name}: the message would not ping them`);
    });
    await option.click();
    await page.locator(TEXTBOX).first().focus();
  }
  const before = new Set((await messages(page)).map((message) => message.id));
  const opening = text
    .split(/\{[^}]+\}/)
    .map((part) => part.trim())
    .find(Boolean)
    .slice(0, 24);
  await demo.press({ key: 'Enter' });
  // The sent message, once Discord has swapped the id it shows while sending for the server's: the same id read on
  // several polls in a row.
  let last;
  let seen = 0;
  return waitFor(
    async () => {
      const found = (await messages(page))
        .filter((message) => !before.has(message.id) && !fromAgent(message) && message.content.includes(opening))
        .pop();
      seen = found?.at && found.id === last?.id ? seen + 1 : 0;
      last = found;
      return seen >= 6 ? found : undefined;
    },
    { timeout: 20_000, what: 'Discord to send the message' },
  );
};

/**
 * Waits for Kai's answer to `sent` in the open conversation, with a live stopwatch, and records the time between the
 * two by Discord's timestamps. Kai answers as a reply, so a reply to another message (a late one) is not taken.
 */
const awaitReply = async ({ demo, page }, sent, label, { match = () => true } = {}) => {
  await drawLatency(page, { label, since: Date.now() });
  await demo.speed({ factor: WAIT_SPEED });
  try {
    const reply = await waitFor(
      async () =>
        (await messages(page)).find(
          (message) =>
            fromAgent(message) &&
            message.at > sent.at &&
            (message.replyTo === undefined || message.replyTo === sent.id) &&
            match(message),
        ),
      { timeout: REPLY_TIMEOUT, what: `${AGENT}'s answer (${label})` },
    );
    await record(page, label, reply.at - sent.at, reply.id);
    return reply;
  } finally {
    await demo.speed({ factor: 1 });
  }
};

/** Sends a message in the thread and waits for Kai's answer to it. */
const exchange = async (context, text, label, options) => {
  const sent = await send(context, text);
  return awaitReply(context, sent, label, options);
};

/**
 * The card Discord puts under a message once a thread is started on it. It repeats the message's opening words, which
 * tells it apart from the message's other buttons (its author, its mentions); its chevron is an icon, not text.
 */
const threadCardSelector = (message) => {
  const words = message.content
    .replace(/@[\w ]+?\s{2}/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(' ');
  return `${MESSAGE}[id$="-${message.id}"] [role="button"]:has-text(${JSON.stringify(words)})`;
};
const threadCard = (page, message) => page.locator(threadCardSelector(message));

/** Discord's view of a thread started from a message: the thread has the message's id. */
const threadUrl = (messageId) => `https://discord.com/channels/${GUILD}/${messageId}`;

/** Marks the DM's messages from `since` on as shown; the earlier history stays hidden. */
const keepFrom = (page, since) =>
  page.evaluate((since) => {
    for (const item of document.querySelectorAll('li[id^="chat-messages-"]')) {
      const time = item.querySelector('time[datetime]')?.getAttribute('datetime');
      if (time && Date.parse(time) >= since) {
        item.classList.add('autocue-keep');
      }
    }
  }, since);

export const steps = [
  {
    name: 'Open the channel',
    setup: true,
    run: async ({ demo, page }) => {
      await page.context().addInitScript((css) => {
        // The DM is only ever opened by a full load of its URL, so the rules are in place before anything renders.
        if (!location.pathname.startsWith('/channels/@me')) {
          return;
        }
        const style = () => {
          if (!document.getElementById('autocue-privacy')) {
            const sheet = document.createElement('style');
            sheet.id = 'autocue-privacy';
            sheet.textContent = css;
            document.head.append(sheet);
          }
        };
        document.head ? style() : document.addEventListener('DOMContentLoaded', style);
      }, PRIVACY_STYLE);
      await demo.goto({ url: state.threadUrl ?? CHANNEL_URL });
      await page.locator(TEXTBOX).first().waitFor({ state: 'visible', timeout: 60_000 });
      await drawLatency(page);
    },
  },
  {
    name: 'Mention Kai to start a thread about a made-up offsite',
    narration: 'Mention Kai in the DXOS Discord, and it opens a thread to brainstorm an offsite.',
    done: () => Boolean(state.threadUrl),
    run: async (context) => {
      const { demo, page } = context;
      await demo.title({ value: 'Kai on Discord', subtitle: 'Every answer timed', hold: 3_600 });
      await demo.caption({ value: 'Mention Kai to start a thread', subtitle: 'from plugin-agent/PLUGIN.mdl QA-6' });
      const sent = await send(context, MESSAGES.start);
      state.start = sent;
      save();
      // Kai starts a thread on the message and answers in it. The take stays on the channel until the answer is
      // there, watching the thread in a tab the recorder does not see; the thread appears before its first message.
      state.threadUrl = threadUrl(sent.id);
      save();
      await drawLatency(page, { label: LABELS.start, since: Date.now() });
      await demo.speed({ factor: WAIT_SPEED });
      const watcher = await page.context().newPage();
      try {
        await waitFor(
          async () => {
            if (!(await threadCard(page, sent).count())) {
              return false;
            }
            if (!watcher.url().endsWith(`/${sent.id}`)) {
              await watcher.goto(state.threadUrl);
            }
            return (await messages(watcher)).some((message) => fromAgent(message) && message.at > sent.at);
          },
          { timeout: REPLY_TIMEOUT, what: `${AGENT}'s first answer in its thread` },
        );
      } finally {
        await watcher.close();
        await demo.speed({ factor: 1 });
      }
      await page.bringToFront();
    },
  },
  {
    name: 'Enter the thread',
    run: async (context) => {
      const { demo, page } = context;
      await demo.caption({ value: 'Kai answers in the thread' });
      if ((await threadCard(page, state.start).count()) > 0) {
        await demo.click({ selector: threadCardSelector(state.start), label: 'Thread' });
      }
      // The card opens the thread in a panel beside the channel, where the channel's message box comes first; the
      // thread's own page has only the thread's.
      await demo.sleep({ ms: 1_500 });
      await demo.goto({ url: state.threadUrl });
      await page.locator(TEXTBOX).last().waitFor({ state: 'visible', timeout: 30_000 });
      await awaitReply(context, state.start, LABELS.start);
    },
  },
  {
    name: 'Brainstorm the second day',
    narration: 'Kai brainstorms in the thread, and every answer is timed.',
    run: async (context) => {
      await context.demo.caption({ value: 'Brainstorm day two with Kai' });
      await exchange(context, MESSAGES.dayTwo, LABELS.dayTwo);
    },
  },
  {
    name: 'Brainstorm the budget',
    run: async (context) => {
      await context.demo.caption({ value: 'Ask Kai what to cut' });
      await exchange(context, MESSAGES.budget, LABELS.budget);
    },
  },
  {
    name: 'Put the plan in a document marked as a test',
    narration: 'Kai writes the plan into a document, marked as a test.',
    done: () => Boolean(state.docUrl),
    run: async (context) => {
      await context.demo.caption({ value: 'Ask Kai to write the plan up', subtitle: DOC_TITLE });
      const reply = await exchange(context, MESSAGES.document, LABELS.document, { match: hasDocLink });
      state.docUrl = reply.links.find((link) => DOC_LINK.test(link)) ?? reply.content.match(DOC_LINK)[0];
      save();
    },
  },
  {
    name: 'Ask Kai to DM the document',
    narration: 'Kai sends the link as a direct message.',
    done: () => Boolean(state.dm),
    run: async (context) => {
      const { demo, page } = context;
      await demo.caption({ value: `Ask Kai to DM the document to @${PERSON}` });
      const sent = await send(context, MESSAGES.dm);
      state.dmRequestedAt = sent.at;
      save();
      // Kai answers with the DM itself. The DM list is the presenter's own, so the DM is watched in a tab the recorder
      // does not see, and shown on camera once it has arrived.
      await drawLatency(page, { label: LABELS.dm, since: Date.now() });
      await demo.speed({ factor: WAIT_SPEED });
      const lookup = await page.context().newPage();
      try {
        await lookup.goto('https://discord.com/channels/@me');
        const href = await lookup.locator(DM_ENTRY).first().getAttribute('href', { timeout: 30_000 });
        state.dmUrl = new URL(href, 'https://discord.com').href;
        await lookup.goto(state.dmUrl);
        state.dm = await waitFor(
          async () =>
            (await messages(lookup)).find(
              (message) => message.at >= sent.at && fromAgent(message) && hasDocLink(message),
            ),
          { timeout: REPLY_TIMEOUT, what: `${AGENT}'s DM with the document's link` },
        );
      } finally {
        await lookup.close();
        await demo.speed({ factor: 1 });
      }
      await record(page, LABELS.dm, state.dm.at - sent.at, state.dm.id);
    },
  },
  {
    name: 'Ask Kai to edit the document',
    narration: 'Kai edits the same document on request.',
    run: async (context) => {
      await context.demo.caption({ value: 'Ask Kai to add a packing list' });
      await exchange(context, MESSAGES.edit, LABELS.edit);
    },
  },
  {
    name: 'Go to the DM and open the document',
    run: async ({ demo, page }) => {
      await demo.caption({ value: `The DM from ${AGENT}` });
      await demo.goto({ url: state.dmUrl });
      await waitFor(
        async () => {
          await keepFrom(page, state.dmRequestedAt);
          return (await page.locator(`${MESSAGE}.autocue-keep`).count()) > 0;
        },
        { timeout: 30_000, what: 'the DM to load' },
      );
      await drawLatency(page);
      await demo.hover({ selector: `${MESSAGE}.autocue-keep a[href*="composer.space/w/"]`, label: DOC_TITLE });
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Render the document in Composer',
    narration: 'The link opens the document in Composer, with Kai’s edit in it.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Open the document in Composer' });
      // The link is followed in this tab, so the take stays on one page: Discord would open a new one.
      const opened = Date.now();
      await demo.goto({ url: toDevComposer(state.docUrl) });
      await drawLatency(page, { label: LABELS.render, since: opened });
      // Rendered means the edited document: its title and the packing list Kai added.
      await waitFor(
        async () =>
          (await page
            .locator(PLANK)
            .filter({ hasText: /Driftwood/ })
            .filter({ hasText: /packing list/i })
            .count()) > 0,
        { timeout: RENDER_TIMEOUT, what: `"${DOC_TITLE}" with its packing list in Composer` },
      );
      await record(page, LABELS.render, Date.now() - opened);
    },
  },
  {
    name: 'Hold the result',
    narration:
      'Kai worked from Discord on the same document you open in Composer, synced through DXOS, with every answer timed.',
    run: async ({ demo, page }) => {
      const answers = latencies.filter(({ messageId }) => messageId);
      const total = answers.reduce((sum, { ms }) => sum + ms, 0);
      await demo.caption({ value: `${answers.length} answers from Kai, ${seconds(total)} of waiting in all` });
      await drawLatency(page);
      await demo.sleep({ ms: LINGER });
    },
  },
];

//
// Copyright 2026 DXOS.org
//

/**
 * Eagerly expose a demo-control API on `globalThis.__DEMO__` so it's drivable
 * from DevTools without needing any Composer UI affordance. The API is thin —
 * it reaches out to `__DXOS__.client` (mounted by the DXOS client at startup)
 * to find the active space each time a method is called.
 *
 * Deliberately no capability / no effect / no React. Runs at bundle load time
 * so it's available as soon as the plugin module is imported.
 */

import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { GitHub } from '@dxos/plugin-github/types';
import { Granola } from '@dxos/plugin-granola/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Trello } from '@dxos/plugin-trello/types';

import { bootstrapFromEnv } from './containers/DemoPanel/bootstrap-from-env';
import { pollMergedPullRequests } from './containers/DemoPanel/pr-poller';
import { seedSoftwareTeamFixture } from './containers/DemoPanel/seed-fixture';
import { startObservers } from './observers';
import { Demo } from './types';

type AnySpace = {
  state?: { get?: () => unknown };
  waitUntilReady: () => Promise<void>;
  db: any;
  queues: { get: (dxn: any) => any };
};

const resolveSpace = (): AnySpace | undefined => {
  const hook = (globalThis as any).__DXOS__;
  const client = hook?.client;
  if (!client) {
    return undefined;
  }
  const fromDefault = client.spaces?.default;
  if (fromDefault) {
    return fromDefault;
  }
  const all: AnySpace[] = typeof client.spaces?.get === 'function' ? client.spaces.get() : [];
  return all.find((space) => String(space.state?.get?.()).includes('READY')) ?? all[0];
};

const DEMO_SCHEMAS = [
  Demo.DemoController,
  Demo.DemoEvent,
  Demo.DemoMatch,
  Demo.DemoNudge,
  Demo.SlackChatLink,
  Granola.GranolaSyncRecord,
  Granola.GranolaAccount,
  Markdown.Document,
  Trello.TrelloBoard,
  Trello.TrelloCard,
  GitHub.GitHubAccount,
  GitHub.GitHubRepo,
  GitHub.GitHubPullRequest,
] as const;

let schemasRegistered = false;

const ensureReady = async (): Promise<AnySpace> => {
  const space = resolveSpace();
  if (!space) {
    throw new Error('DXOS client not ready yet. Wait a second after page load, or create a space.');
  }
  await space.waitUntilReady();
  if (!schemasRegistered) {
    const registry = space.db?.graph?.schemaRegistry ?? space.db?.schemaRegistry;
    if (registry?.register) {
      // Register one-at-a-time so a single "already registered" conflict
      // doesn't abort the whole batch.
      let added = 0;
      let skipped = 0;
      for (const schema of DEMO_SCHEMAS) {
        try {
          await registry.register([schema] as any);
          added += 1;
        } catch {
          skipped += 1;
        }
      }
      schemasRegistered = true;
      log.info('demo: schema registration', { added, skipped, total: DEMO_SCHEMAS.length });
    }
  }
  startObservers(space.db, space);
  return space;
};

const GRANOLA_FIXTURES: { title: string; summary: string; attendees: string[] }[] = [
  {
    title: 'Sprint Planning — Widgets Team',
    summary: [
      '## Meeting summary',
      '',
      '- Alice walked through the Q2 roadmap.',
      '- Bob raised the **color picker redesign** — confusing UX for colorblind users.',
      '  - Agreed to ship HSL + preview swatch.',
      '- Dana flagged the **widget dragging bug** (drop-target flicker).',
      '',
      '## Action items',
      '- [ ] Bob to draft color-picker spec by Wednesday.',
    ].join('\n'),
    attendees: ['Alice Chen', 'Bob Kaur', 'Dana Rivera'],
  },
  {
    title: 'Design 1:1 — Color Picker Redesign',
    summary: 'Settled on HSL sliders with live preview. Bob spikes a Figma prototype by Thursday.',
    attendees: ['Alice Chen', 'Bob Kaur'],
  },
];

let fixtureIndex = 0;

const api = {
  help() {
    return {
      bootstrap: 'Seed Widgets-team fixture + wire real Trello/Granola from localStorage.',
      seed: 'Just seed the Widgets-team fixture.',
      injectGranolaNote: 'Fire a fake Granola note → triggers aiMatch against cards.',
      injectPrMerged: 'Fire a synthetic PR merge → triggers Slack nudge.',
      injectSlackMessage: 'Fire a fake Slack message.',
      pollGithub: 'Poll the real GitHub repo once.',
      replayMerge: 'Re-fire a pr-merged event for a PR that merged before the observer started.',
      whichSpace: 'Show the space id the demo is writing into.',
      status: 'Dump counts + content of events, matches, nudges, cards, PRs.',
      reset: 'Clear all demo events/matches/nudges.',
    };
  },

  async bootstrap() {
    const space = await ensureReady();
    const result = await bootstrapFromEnv(space.db, space);
    return { spaceId: (space as any).id, ...result };
  },

  async seed() {
    const space = await ensureReady();
    return seedSoftwareTeamFixture(space.db);
  },

  /** Send a message to the shared-agent's canonical chat. The shared-agent
   *  observer will see the user message, call Claude with tools, and respond.
   *  Usage:  await __DEMO__.chat("move the color picker to done")
   */
  async chat(text: string) {
    const space = await ensureReady();
    const links = await space.db.query(Filter.type(Demo.SlackChatLink)).run();
    if (links.length === 0) {
      return { error: 'No SlackChatLink — post something in #widgets-eng first so the mirror creates one.' };
    }
    const chat = links[0].chat?.target;
    if (!chat?.feed?.target) {
      return { error: 'SlackChatLink has no chat with feed.' };
    }
    const { Feed: F } = await import('@dxos/echo');
    const { Message: M } = await import('@dxos/types');
    const queueDxn = F.getQueueDxn(chat.feed.target);
    if (!queueDxn) {
      return { error: 'No queue DXN.' };
    }
    const queue = space.queues.get(queueDxn);
    if (!queue) {
      return { error: 'No queue.' };
    }
    await queue.append([
      Obj.make(M.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [{ _tag: 'text', text }],
      }),
    ]);
    return { ok: true, chatName: chat.name, chatId: chat.id };
  },

  async injectGranolaNote() {
    const space = await ensureReady();
    const fixture = GRANOLA_FIXTURES[fixtureIndex % GRANOLA_FIXTURES.length];
    fixtureIndex += 1;
    const granolaId = `demo-${Date.now()}`;
    const doc = space.db.add(Markdown.make({ name: fixture.title, content: fixture.summary }));
    space.db.add(
      Obj.make(Granola.GranolaSyncRecord, {
        granolaId,
        document: Ref.make(doc),
        attendees: fixture.attendees.map((name) => ({ name })),
        calendarEvent: { title: fixture.title },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
    space.db.add(
      Demo.makeEvent({
        kind: 'granola-note',
        label: `Granola note arrived: ${fixture.title}`,
        payload: { granolaId, title: fixture.title },
      }),
    );
    return { granolaId, title: fixture.title };
  },

  async injectPrMerged() {
    const space = await ensureReady();
    space.db.add(
      Demo.makeEvent({
        kind: 'pr-merged',
        label: 'GitHub PR #123 merged: fix color picker bug',
        payload: {
          number: 123,
          repo: 'widgets/widgets-app',
          title: 'fix color picker bug — honor HSL inputs in onChange',
          author: 'bob-kaur',
          mergedAt: new Date().toISOString(),
          relatedKeywords: ['color picker', 'hsl', 'picker'],
        },
      }),
    );
  },

  async injectSlackMessage() {
    const space = await ensureReady();
    space.db.add(
      Demo.makeEvent({
        kind: 'slack-message',
        label: 'Slack: @alice — any update on the picker?',
        payload: {
          channel: 'widgets-eng',
          from: 'bob-kaur',
          mentions: ['alice'],
          text: 'hey @alice — any update on the color picker redesign?',
        },
      }),
    );
  },

  async pollGithub() {
    const space = await ensureReady();
    const pat = globalThis.localStorage?.getItem('GITHUB_PAT') ?? '';
    const repo = globalThis.localStorage?.getItem('GITHUB_REPO') ?? '';
    if (!pat || !repo) {
      throw new Error('GITHUB_PAT and GITHUB_REPO must be set in localStorage.');
    }
    return pollMergedPullRequests(space.db, { pat, repo });
  },

  /**
   * Re-fire a pr-merged DemoEvent for an already-merged PR. Use this for
   * rehearsal when you don't want to open a fresh PR on GitHub just to
   * trigger the nudge loop.
   */
  async replayMerge(prNumber: number) {
    const space = await ensureReady();
    const pat = globalThis.localStorage?.getItem('GITHUB_PAT') ?? '';
    const repo = globalThis.localStorage?.getItem('GITHUB_REPO') ?? '';
    if (!pat || !repo) {
      throw new Error('GITHUB_PAT and GITHUB_REPO must be set in localStorage.');
    }
    const response = await fetch(`/api/github/repos/${repo}/pulls/${prNumber}`, {
      headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!response.ok) {
      throw new Error(`GitHub ${response.status}: ${await response.text()}`);
    }
    const pr = (await response.json()) as {
      number: number;
      title: string;
      body?: string;
      html_url: string;
      merged_at?: string;
      user?: { login: string };
    };
    const title = pr.title;
    const body = (pr.body ?? '').slice(0, 4000);
    const keywords = [...`${title}\n${body}`.toLowerCase().matchAll(/[a-z][a-z0-9-]{3,}/g)]
      .map((match) => match[0])
      .filter((token, index, array) => array.indexOf(token) === index)
      .slice(0, 10);
    space.db.add(
      Demo.makeEvent({
        kind: 'pr-merged',
        label: `[replay] GitHub PR #${pr.number} merged: ${title}`,
        payload: {
          number: pr.number,
          repo,
          title,
          author: pr.user?.login,
          url: pr.html_url,
          mergedAt: pr.merged_at ?? new Date().toISOString(),
          relatedKeywords: keywords,
        },
      }),
    );
    return { number: pr.number, title, keywords };
  },

  /** Return the space ID the demo is operating against. Useful when Composer is showing a different space. */
  async whichSpace() {
    const space = await ensureReady();
    return { spaceId: (space as any).id, name: (space as any).properties?.name };
  },

  /** Dump a snapshot of what the demo has written so far: events / matches / nudges / cards. */
  async status() {
    const space = await ensureReady();
    const [events, matches, nudges, cards, pullRequests] = await Promise.all([
      space.db.query(Filter.type(Demo.DemoEvent)).run(),
      space.db.query(Filter.type(Demo.DemoMatch)).run(),
      space.db.query(Filter.type(Demo.DemoNudge)).run(),
      space.db.query(Filter.type(Trello.TrelloCard)).run(),
      space.db.query(Filter.type(GitHub.GitHubPullRequest)).run(),
    ]);
    return {
      spaceId: (space as any).id,
      events: events.length,
      matches: matches.map((match: any) => ({
        document: match.document?.target?.name,
        card: match.card?.target?.name,
        confidence: match.confidence,
        source: match.source,
        reasoning: match.reasoning,
      })),
      nudges: nudges.map((nudge: any) => ({
        channel: nudge.channel,
        mention: nudge.mention,
        text: nudge.text?.slice(0, 200),
        card: nudge.card?.target?.name,
      })),
      cards: cards.map((card: any) => ({ name: card.name, list: card.listName })),
      pullRequests: pullRequests.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        merged: Boolean(pr.mergedAt),
      })),
    };
  },

  async reset() {
    const space = await ensureReady();
    const events = await space.db.query(Filter.type(Demo.DemoEvent)).run();
    const matches = await space.db.query(Filter.type(Demo.DemoMatch)).run();
    const nudges = await space.db.query(Filter.type(Demo.DemoNudge)).run();
    for (const row of [...events, ...matches, ...nudges]) {
      space.db.remove(row);
    }
    return { events: events.length, matches: matches.length, nudges: nudges.length };
  },
};

if (typeof globalThis !== 'undefined') {
  (globalThis as any).__DEMO__ = api;
  log.info('demo: window.__DEMO__ ready — try __DEMO__.help()');
}

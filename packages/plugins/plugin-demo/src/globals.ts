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
import { Demo } from './types';

type AnySpace = {
  state?: { get?: () => unknown };
  waitUntilReady: () => Promise<void>;
  db: any;
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
      status: 'Dump counts + content of events, matches, nudges, cards, PRs.',
      reset: 'Clear all demo events/matches/nudges.',
    };
  },

  async bootstrap() {
    const space = await ensureReady();
    return bootstrapFromEnv(space.db);
  },

  async seed() {
    const space = await ensureReady();
    return seedSoftwareTeamFixture(space.db);
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

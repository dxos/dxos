//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as Team from '../team/index.ts';
import { REFERENCE } from '../util.ts';
import { Partial } from './partial.ts';

type Ref = { '/': string };

type ArchiveObject = {
  'id': string;
  '@type'?: string;
  '@parent'?: string;
  'feed'?: Ref;
  'tasks'?: Ref[];
  'status'?: string;
  'enabled'?: boolean;
  'assignee'?: { identityDid?: string };
  'history'?: Array<{ event: string; date: string; description?: string; actor?: { identityDid?: string } }>;
};

type TraceEvent = { type: string; timestamp: number; data: Record<string, string | undefined> };

type FeedMessage = {
  '@type'?: string;
  'created'?: string;
  'meta'?: { pid?: string; parentPid?: string; processName?: string; conversation?: Ref };
  'events'?: TraceEvent[];
};

type Archive = {
  objects: ArchiveObject[];
  feeds: Array<{ feedObjectId: string; namespace: string; messages: FeedMessage[] }>;
};

const DAY = 86_400_000;

const idOf = (ref: Ref | string | undefined) => (typeof ref === 'string' ? ref : ref?.['/'])?.split('/').at(-1);

const typed = (objects: ArchiveObject[], type: string) => objects.filter((object) => object['@type']?.includes(type));

describe('Alien Labs projects', () => {
  test('seeds four projects and the agent runs behind their tasks', { timeout: 120_000 }, async ({ expect }) => {
    const definition = SampleSpace.make({
      space: { name: 'Alien Labs projects' },
      reference: REFERENCE,
      partials: { team: Team.Partial, projects: Partial },
      build: (partials) => Effect.flatMap(partials.team(), (team) => partials.projects({ team })),
    });
    const { result, json } = await EffectEx.runPromise(buildArchive(definition));
    const archive: Archive = JSON.parse(json);
    const counts = histogram(json);
    const count = (type: string) =>
      Object.entries(counts).reduce((total, [key, value]) => (key.includes(type) ? total + value : total), 0);
    const now = Date.parse(REFERENCE);
    const start = now - 60 * DAY;

    // 4 projects, 4 task sets, 50 tasks with the status mix.
    expect(count('type.project:')).toBe(4);
    expect(count('type.taskSet:')).toBe(4);
    expect(count('type.task:')).toBe(50);
    const tasks = typed(archive.objects, 'type.task:');
    const statuses = tasks.reduce<Record<string, number>>((mix, task) => {
      const status = task.status === 'backlog' ? 'todo' : task.status!;
      return { ...mix, [status]: (mix[status] ?? 0) + 1 };
    }, {});
    expect(statuses).toEqual({ done: 20, review: 5, started: 8, blocked: 3, failed: 2, todo: 10, cancelled: 2 });
    expect(result.tasks.cacheKeyCollision).toBeDefined();
    expect(result.tasks.release18).toBeDefined();

    // 35 tasks are assigned to an agent.
    const agentDids = new Set(typed(archive.objects, 'type.agent:').map((agent) => (agent as { did?: string }).did));
    expect(agentDids.size).toBe(4);
    const agentTasks = tasks.filter((task) => agentDids.has(task.assignee?.identityDid));
    expect(agentTasks).toHaveLength(35);

    // 40 chats, with a run in every week from -60d to the reference date.
    const chats = typed(archive.objects, 'assistant.chat');
    expect(chats).toHaveLength(40);
    const feeds = new Map(archive.feeds.map((feed) => [feed.feedObjectId, feed.messages]));
    const trace = archive.feeds.find((feed) => feed.namespace === 'trace')!.messages;
    const events = trace.flatMap((message) =>
      (message.events ?? []).map((event) => ({ ...event, meta: message.meta! })),
    );
    const begins = events.filter((event) => event.type === 'assistant.agentRequestBegin');
    for (let week = 0; week * 7 < 60; week++) {
      const from = start + week * 7 * DAY;
      const to = Math.min(now, from + 7 * DAY);
      expect(begins.some((event) => event.timestamp >= from && event.timestamp < to)).toBe(true);
    }
    for (const chat of chats) {
      const messages = feeds.get(idOf(chat.feed)!) ?? [];
      expect(messages.length).toBeGreaterThanOrEqual(8);
      expect(messages.length).toBeLessThanOrEqual(30);
      expect(chat.tasks?.length).toBeGreaterThan(0);
    }

    // Every agent task that has run has a chat, a trace, and a status event per status change its runs made.
    const chatsByTask = new Map<string, ArchiveObject[]>();
    for (const chat of chats) {
      for (const ref of chat.tasks ?? []) {
        const taskId = idOf(ref);
        if (taskId) {
          chatsByTask.set(taskId, [...(chatsByTask.get(taskId) ?? []), chat]);
        }
      }
    }
    const statusEvents = events.filter((event) => event.type === 'task.statusChanged');
    const ran = agentTasks.filter((task) => ['started', 'review', 'done', 'failed'].includes(task.status!));
    expect(ran.length).toBeGreaterThan(0);
    for (const task of ran) {
      const taskChats = chatsByTask.get(task.id) ?? [];
      expect(taskChats.length).toBeGreaterThan(0);
      const conversations = new Set(taskChats.map((chat) => idOf(chat.feed)));
      expect(trace.some((message) => conversations.has(idOf(message.meta?.conversation)))).toBe(true);
      const traced = statusEvents
        .filter((event) => event.data.taskId === task.id && event.data.previousStatus)
        .map((event) => `${event.data.previousStatus}>${event.data.status}`);
      const logged = (task.history ?? [])
        .filter((entry) => entry.actor?.identityDid && agentDids.has(entry.actor.identityDid))
        .flatMap((entry) => entry.description?.match(/^Status changed from (\w+) to (\w+)\.$/)?.slice(1, 3) ?? [])
        .reduce<string[]>(
          (pairs, status, index, all) => (index % 2 ? [...pairs, `${all[index - 1]}>${status}`] : pairs),
          [],
        );
      expect(traced.length).toBeGreaterThan(0);
      expect(traced).toEqual(logged);
    }

    // Every trace's conversation is a chat's feed in the space.
    const chatFeeds = new Set(chats.map((chat) => idOf(chat.feed)));
    expect(trace.length).toBeGreaterThan(0);
    expect(trace.every((message) => chatFeeds.has(idOf(message.meta?.conversation)))).toBe(true);
    expect(
      begins.every((event) => ['Builder', 'Reviewer', 'Triage', 'Scribe'].includes(event.meta.processName ?? '')),
    ).toBe(true);

    // Every chat and trace timestamp falls between -60d and the reference date.
    const times = [
      ...events.map((event) => event.timestamp),
      ...chats.flatMap((chat) => (feeds.get(idOf(chat.feed)!) ?? []).map((message) => Date.parse(message.created!))),
    ];
    expect(times.every((time) => time >= start && time <= now)).toBe(true);

    // The cache Gantt: at least 3 sessions overlap, and every undelegated bar from started to review spans a day.
    const cache = result.projects.cache.id;
    const sessions = chats
      .filter((chat) => idOf(chat['@parent']) === cache)
      .map((chat) => {
        const own = events.filter((event) => idOf(event.meta.conversation) === idOf(chat.feed));
        const times = own
          .filter((event) => event.type.startsWith('assistant.agentRequest'))
          .map((event) => event.timestamp);
        const delegated = own.some((event) => event.type === 'assistant.agentRequestBegin' && event.meta.parentPid);
        return { own, delegated, begin: Math.min(...times), end: Math.max(...times) };
      });
    const parallel = Math.max(
      ...sessions.map(({ begin }) => sessions.filter((run) => run.begin <= begin && run.end > begin).length),
    );
    expect(parallel).toBeGreaterThanOrEqual(3);
    const bars = sessions.flatMap(({ own, delegated }) =>
      (delegated ? [] : own)
        .filter((event) => event.type === 'task.statusChanged' && event.data.status === 'review')
        .map((close) => {
          const open = own.find((event) => event.data.taskId === close.data.taskId && event.data.status === 'started');
          return close.timestamp - (open?.timestamp ?? close.timestamp);
        }),
    );
    expect(bars.length).toBeGreaterThan(0);
    expect(bars.every((span) => span >= DAY)).toBe(true);

    // The trigger is disabled.
    const triggers = typed(archive.objects, 'type.trigger:');
    expect(triggers).toHaveLength(1);
    expect(triggers.every((trigger) => trigger.enabled === false)).toBe(true);
  });
});

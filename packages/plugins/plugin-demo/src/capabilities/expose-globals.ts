//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Collection, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Granola } from '@dxos/plugin-granola/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { type Space } from '@dxos/react-client/echo';

import { bootstrapFromEnv } from '../containers/DemoPanel/bootstrap-from-env';
import { pollMergedPullRequests } from '../containers/DemoPanel/pr-poller';
import { seedSoftwareTeamFixture } from '../containers/DemoPanel/seed-fixture';
import { Demo } from '../types';

/** Resolve the space the demo should operate against — default (personal) or first ready. */
const resolveSpace = (client: any): Space | undefined => {
  const spaces: Space[] = typeof client.spaces?.get === 'function' ? client.spaces.get() : [];
  return (
    client.spaces?.default ??
    spaces.find((space) => String(space.state?.get?.()).includes('READY')) ??
    spaces[0]
  );
};

const GRANOLA_FIXTURES: { title: string; summary: string; attendees: string[] }[] = [
  {
    title: 'Sprint Planning — Widgets Team',
    summary: [
      '## Meeting summary',
      '',
      '- Alice walked through the Q2 roadmap.',
      '- Bob raised the **color picker redesign**: confusing UX for colorblind users.',
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

export default Capability.makeModule(() =>
  Effect.gen(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);

    const ensureReady = async (): Promise<Space> => {
      const space = resolveSpace(client);
      if (!space) {
        throw new Error('No space available. Create or open a space in Composer first.');
      }
      await space.waitUntilReady();
      return space;
    };

    const api = {
      /** Seed fixture + wire TrelloBoard/GranolaAccount from localStorage credentials. */
      async bootstrap() {
        const space = await ensureReady();
        return bootstrapFromEnv(space.db, space);
      },

      /** Just seed the Widgets-team fixture (without wiring real credentials). */
      async seed() {
        const space = await ensureReady();
        return seedSoftwareTeamFixture(space.db);
      },

      /** Inject a synthetic Granola note (rotates through fixtures). */
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

      /** Inject a synthetic PR-merged event referring to the color-picker fix. */
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

      /** Inject a synthetic Slack message. */
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

      /** Manually trigger a GitHub PR poll against whatever is in localStorage. */
      async pollGithub() {
        const space = await ensureReady();
        const pat = globalThis.localStorage?.getItem('GITHUB_PAT') ?? '';
        const repo = globalThis.localStorage?.getItem('GITHUB_REPO') ?? '';
        if (!pat || !repo) {
          throw new Error('GITHUB_PAT and GITHUB_REPO must be set in localStorage.');
        }
        return pollMergedPullRequests(space.db, { pat, repo });
      },

      /** Wipe all demo events, matches, and nudges from the space. */
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

      /** List what's available. */
      help() {
        return {
          bootstrap: 'Seed Widgets-team fixture + wire real Trello/Granola from localStorage.',
          seed: 'Just seed the Widgets-team fixture.',
          injectGranolaNote: 'Fire a fake Granola note → triggers aiMatch against cards.',
          injectPrMerged: 'Fire a fake PR merge → triggers Slack nudge.',
          injectSlackMessage: 'Fire a fake Slack message.',
          pollGithub: 'Poll the real GitHub repo once.',
          reset: 'Clear all demo events/matches/nudges.',
        };
      },
    };

    (globalThis as any).__DEMO__ = api;
    log.info('demo: globals exposed on window.__DEMO__');

    // Linear auto-sync: fetch issues as Tasks + create Kanban board in root collection.
    const linearApiKey = globalThis.localStorage?.getItem('LINEAR_API_KEY');
    console.log('linear: api key', linearApiKey ? 'found' : 'missing');
    if (linearApiKey) {
      void (async () => {
        try {
          console.log('linear: starting sync...');
          const { fetchRecentIssues } = await import('@dxos/plugin-linear');
          const { Task } = await import('@dxos/types');
          const { Kanban } = await import('@dxos/plugin-kanban/types');
          const { ViewModel } = await import('@dxos/schema');
          console.log('linear: imports loaded');

          const space = await ensureReady();
          console.log('linear: space ready');
          const rootCollection = space.properties[Collection.Collection.typename]?.target;
          const addToCollection = (obj: any) => {
            if (rootCollection) {
              Obj.change(rootCollection, (c: any) => { c.objects.push(Ref.make(obj)); });
            }
          };

          // Sync tasks.
          const tasks = await fetchRecentIssues({ apiKey: linearApiKey });
          const existing: Task.Task[] = await space.db.query(Filter.type(Task.Task)).run();
          const existingIds = new Set(
            existing.flatMap((t: any) => {
              const keys = Obj.getMeta(t).keys;
              return keys?.filter((k: any) => k.source === 'linear.app').map((k: any) => k.id) ?? [];
            }),
          );

          let added = 0;
          for (const task of tasks) {
            const linearId = Obj.getMeta(task).keys?.find((k: any) => k.source === 'linear.app')?.id;
            if (linearId && existingIds.has(linearId)) {
              continue;
            }
            space.db.add(task);
            addToCollection(task);
            added++;
          }

          // Create Kanban board if none exists.
          const kanbans: Kanban.Kanban[] = await space.db.query(Filter.type(Kanban.Kanban)).run();
          if (!kanbans.some((k: any) => k.name === 'Linear Issues')) {
            const { view } = await ViewModel.makeFromDatabase({
              db: space.db,
              typename: 'org.dxos.type.task',
              pivotFieldName: 'status',
              fields: ['title', 'status', 'priority', 'description'],
              createInitial: 0,
            });
            const kanban = Kanban.make({
              name: 'Linear Issues',
              view,
              arrangement: { order: ['todo', 'in-progress', 'done'], columns: {} },
            });
            space.db.add(kanban);
            addToCollection(kanban);
          }

          // Write-back: watch for local Task changes and push to Linear.
          const { updateIssue } = await import('@dxos/plugin-linear');
          const allTasks: Task.Task[] = await space.db.query(Filter.type(Task.Task)).run();
          const linearTasks = allTasks.filter((t: any) =>
            Obj.getMeta(t).keys?.some((k: any) => k.source === 'linear.app'),
          );
          const snapshots = new Map<string, { status?: string; priority?: string; title?: string }>();
          for (const task of linearTasks) {
            snapshots.set(task.id, { status: task.status, priority: task.priority, title: task.title });
          }

          setInterval(async () => {
            try {
              for (const task of linearTasks) {
                const prev = snapshots.get(task.id);
                if (!prev) {
                  continue;
                }
                const changes: Record<string, string | undefined> = {};
                if (task.status !== prev.status) {
                  changes.status = task.status;
                }
                if (task.priority !== prev.priority) {
                  changes.priority = task.priority;
                }
                if (task.title !== prev.title) {
                  changes.title = task.title;
                }
                if (Object.keys(changes).length > 0) {
                  const linearId = Obj.getMeta(task).keys?.find((k: any) => k.source === 'linear.app')?.id;
                  if (linearId) {
                    await updateIssue({ apiKey: linearApiKey }, linearId, changes);
                    snapshots.set(task.id, { status: task.status, priority: task.priority, title: task.title });
                  }
                }
              }
            } catch (error) {
              console.error('linear: write-back failed', error);
            }
          }, 10_000);

          console.log(`linear: synced ${added} issues, ${tasks.length} total (write-back enabled)`);
        } catch (error) {
          console.error('linear: sync failed', error);
        }
      })();
    }

    return Capability.contributes(Capabilities.Null, null);
  }),
);

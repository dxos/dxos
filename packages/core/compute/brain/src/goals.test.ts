//
// Copyright 2026 DXOS.org
//

// The goal scenarios of plugin-agent's docs/BRAIN.md (PR #13762), compiled by hand into rules, as the brain
// would run them once a goal's text is compiled: rules wake the goal, a judge registration takes the wake, acts,
// and records what it did as facts that other goals can match.

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as TestClock from 'effect/testing/TestClock';

import * as Brain from './Brain.ts';
import type * as Event from './Event.ts';
import type * as Fact from './Fact.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MONDAY = Date.parse('2026-10-05T09:00:00Z');

describe('goals (BRAIN.md examples)', () => {
  it.effect(
    "BRAIN.md's compiled goal 3 parses, stratifies and wakes",
    Effect.fnUntraced(function* () {
      const brain = yield* Brain.make();
      // Verbatim from the design, where `goal` names the goal and `elapsed(goal, 2d)` reads its age.
      yield* brain.addRules({
        id: 'goal3',
        rules: `
          wake(reply)    :- fact(F, _, _, _), speaker(F, dima), force(F, commissive), about(F, "agent plugin").
          wake(refusal)  :- fact(F, _, _, _), speaker(F, dima), force(F, commissive), polarity(F, "-"),
                            about(F, "agent plugin").
          wake(followup) :- elapsed(goal, 2d), not achieved(goal).
          achieved(goal) :- fact(F, _, _, _), speaker(F, dima), force(F, commissive), polarity(F, "+"),
                            about(F, "agent plugin").
        `,
      });
      yield* brain.push([utterance('d1', 'dima', 'will_help', 'agent plugin', { force: 'commissive', polarity: '-' })]);
      expect(yield* brain.ask('wake(R)')).toEqual([{ R: 'reply' }, { R: 'refusal' }]);
      expect(yield* brain.ask('achieved(goal)')).toEqual([]);

      yield* brain.push([utterance('d2', 'dima', 'will_help', 'agent plugin', { force: 'commissive' })]);
      expect(yield* brain.ask('achieved(goal)')).toEqual([{}]);
    }),
  );

  it.effect(
    'goal 1: keep me informed about what Dima is working on (condition, fact driver)',
    Effect.fnUntraced(function* () {
      const brain = yield* Brain.make();
      yield* brain.addRules({
        id: 'goal1',
        rules: `
          % Updates, not noise: Dima's own confident assertions about his work.
          update(rich, F) :- fact(F, dima, works_on, _), force(F, assertive), polarity(F, "+"),
                             confidence(F, C), gte(C, 0.6).
        `,
      });
      yield* brain.register('goal1');
      yield* brain.subscribe('goal1', { selector: { _tag: 'atoms', predicate: 'update', args: ['rich', undefined] } });

      yield* brain.push([
        utterance('f1', 'dima', 'works_on', 'indexer', { confidence: 0.9 }),
        utterance('f2', 'dima', 'works_on', 'release', { confidence: 0.3 }),
        utterance('f3', 'rich', 'works_on', 'docs', { confidence: 0.9 }),
        utterance('f4', 'dima', 'works_on', 'demo', { confidence: 0.9, force: 'directive' }),
      ]);
      const first = yield* brain.take('goal1');
      expect(first.map(({ event }) => secondArg(event))).toEqual(['f1']);
      yield* brain.ack(
        'goal1',
        first.map(({ id }) => id),
      );

      // A condition never closes: every later update is delivered too.
      yield* brain.push([utterance('f5', 'dima', 'works_on', 'agent plugin', { confidence: 0.8 })]);
      expect((yield* brain.take('goal1')).map(({ event }) => secondArg(event))).toEqual(['f5']);
    }),
  );

  it.effect(
    'goal 2: let me know when the release ships (outcome, closes once)',
    Effect.fnUntraced(function* () {
      const brain = yield* Brain.make();
      yield* brain.addRules({
        id: 'goal2',
        rules: `
          % Recognising "shipped" across wordings.
          shipped :- fact(F, release, shipped, _), polarity(F, "+").
          shipped :- fact(F, _, _, _), about(F, "release live"), polarity(F, "+").
          shipped :- fact(_, release, status, released).
          closed(g2) :- fact(_, g2, status, closed).
          wake(g2, shipped) :- shipped, not closed(g2).
        `,
      });
      yield* brain.register('goal2');
      yield* brain.subscribe('goal2', { selector: { _tag: 'atoms', predicate: 'wake', args: ['g2', undefined] } });

      yield* brain.push([utterance('f1', 'josiah', 'is', 'release live', { polarity: '-' })]);
      expect(yield* brain.take('goal2')).toEqual([]);

      yield* brain.push([utterance('f2', 'josiah', 'is', 'release live')]);
      const [wake] = yield* brain.take('goal2');
      expect(wake.event).toMatchObject({ kind: 'derived', atom: { predicate: 'wake', args: ['g2', 'shipped'] } });

      // The judge tells the user once, closes the goal and ends the watch.
      yield* brain.push([{ id: 'c1', subject: { entity: 'g2' }, predicate: 'status', object: { entity: 'closed' } }], {
        origin: 'goal2',
        cause: [wake.id],
      });
      yield* brain.ack('goal2', [wake.id]);
      expect(yield* brain.unsubscribe('goal2')).toBe(true);

      yield* brain.push([utterance('f3', 'josiah', 'shipped', 'v1', { subjectEntity: 'release' })]);
      expect(yield* brain.ask('wake(g2, R)')).toEqual([]);
      expect(yield* brain.ask('shipped')).toEqual([{}]);
    }),
  );

  it.effect(
    'goal 3: get Dima to help me with the agent plugin, over a week (refusal, follow-up, commitment)',
    Effect.fnUntraced(function* () {
      yield* TestClock.setTime(MONDAY);
      const brain = yield* Brain.make();
      yield* brain.addRules({
        id: 'goal3',
        rules: `
          goal(g3).
          dima_on_plugin(F, P) :- fact(F, _, _, _), speaker(F, dima), force(F, commissive), polarity(F, P),
                                  about(F, "agent plugin").
          wake(G, reply, F)     :- goal(G), dima_on_plugin(F, "+").
          wake(G, refusal, F)   :- goal(G), dima_on_plugin(F, "-").
          awaiting_since(G, T)  :- goal(G), fact(F, G, awaiting, dima), said_at(F, T).
          wake(G, followup, T)  :- awaiting_since(G, T), elapsed(T, 2d), not achieved(G).
          achieved(G)           :- goal(G), dima_on_plugin(_, "+").
          status(G, achieved)   :- achieved(G).
          status(G, active)     :- goal(G), not achieved(G).
        `,
      });
      // The judge acts on wakes; goal 1 ("keep me informed") watches anything about Dima.
      yield* brain.register('judge');
      yield* brain.subscribe('judge', {
        selector: { _tag: 'atoms', predicate: 'wake', args: ['g3', undefined, undefined] },
      });
      yield* brain.register('goal1');
      yield* brain.subscribe('goal1', { selector: { _tag: 'facts', pattern: { entity: 'dima' } } });
      yield* brain.subscribe('goal1', { selector: { _tag: 'atoms', predicate: 'achieved' } });

      let now = MONDAY;
      const record = (
        id: string,
        predicate: string,
        object: string,
        cause: readonly string[],
        extra: Partial<Fact.Input> = {},
      ) =>
        brain.push(
          [
            {
              id,
              subject: { entity: 'g3' },
              predicate,
              object: { entity: object },
              saidAt: new Date(now).toISOString(),
              ...extra,
            },
          ],
          { origin: 'judge', cause },
        );
      const advance = Effect.fnUntraced(function* (to: number) {
        now = to;
        yield* TestClock.setTime(to);
        return yield* brain.tick();
      });
      const judge = Effect.fnUntraced(function* () {
        const deliveries = yield* brain.take('judge');
        yield* brain.ack(
          'judge',
          deliveries.map(({ id }) => id),
        );
        return deliveries;
      });

      // Mon: Rich asks; the goal is judged actionable; the agent relays and waits.
      yield* brain.push([
        utterance('r1', 'rich', 'asks', 'get Dima to help me with the agent plugin', { force: 'directive' }),
      ]);
      yield* record('a1', 'relayed', 'dima', []);
      yield* record('a2', 'awaiting', 'dima', []);
      expect(yield* brain.ask('status(g3, S)')).toEqual([{ S: 'active' }]);
      expect(yield* judge()).toEqual([]);

      // Tue: Dima defers; the refusal wakes the goal; its instructions say press the priority.
      yield* advance(MONDAY + DAY + HOUR);
      yield* brain.push([
        utterance('d1', 'dima', 'will_help', 'agent plugin', {
          force: 'commissive',
          polarity: '-',
          quote: 'busy with the release this week',
          saidAt: new Date(now).toISOString(),
        }),
      ]);
      const tuesday = yield* judge();
      expect(tuesday.map(({ event }) => secondArg(event))).toEqual(['refusal']);
      yield* record('a3', 'declined_by', 'dima', [tuesday[0].id]);
      yield* record('a4', 'relayed', 'dima', [tuesday[0].id]);
      yield* record('a5', 'awaiting', 'dima', [tuesday[0].id], { supersedes: ['a2'] });

      // Wed: nothing is due; the follow-up counts from Tuesday's relay, not Monday's.
      yield* advance(MONDAY + 2 * DAY + HOUR);
      expect(yield* judge()).toEqual([]);

      // Thu: two days after the relay, the follow-up alarm wakes the goal.
      yield* advance(MONDAY + 3 * DAY + HOUR);
      const followup = yield* judge();
      expect(followup.map(({ event }) => secondArg(event))).toEqual(['followup']);
      expect(followup[0].event.depth).toBe(0);
      yield* record('a6', 'followed_up', 'dima', [followup[0].id]);

      // Thu: Dima commits; the reply wakes the goal and it is achieved; goal 1's watch sees it.
      yield* advance(MONDAY + 3 * DAY + 6 * HOUR);
      yield* brain.push([
        utterance('d2', 'dima', 'will_help', 'agent plugin', { force: 'commissive', quote: "OK, I'll start on it" }),
      ]);
      expect((yield* judge()).map(({ event }) => secondArg(event))).toEqual(['reply']);
      expect(yield* brain.ask('status(g3, S)')).toEqual([{ S: 'achieved' }]);
      yield* record('a7', 'committed', 'dima', []);

      // Sat: an achieved goal no longer follows up.
      yield* advance(MONDAY + 5 * DAY);
      expect(yield* judge()).toEqual([]);

      const watched = yield* brain.take('goal1');
      expect(
        watched.map(({ event }) =>
          event.kind === 'asserted' ? event.fact.id : event.kind === 'derived' ? event.atom.predicate : event.kind,
        ),
      ).toEqual(['a1', 'a2', 'd1', 'a3', 'a4', 'a5', 'a6', 'd2', 'achieved', 'a7']);
      // The goal's history is in its own feed, for audit.
      expect((yield* brain.query({ subject: 'g3' }, { inactive: true })).map(({ predicate }) => predicate)).toEqual([
        'relayed',
        'awaiting',
        'declined_by',
        'relayed',
        'awaiting',
        'followed_up',
        'committed',
      ]);
    }),
  );

  it.effect(
    'goal 4: keep my inbox empty (volume: cheap wake rules and batching)',
    Effect.fnUntraced(function* () {
      const brain = yield* Brain.make();
      yield* brain.addRules({
        id: 'goal4',
        rules: `
          wake(g4, triage, F) :- fact(F, _, received, email), source(F, inbox).
          archived(F) :- fact(_, F, status, archived).
          unread :- wake(g4, triage, F), not archived(F).
          holds(g4) :- wake(g4, triage, _), not unread.
        `,
      });
      yield* brain.register('triage');
      yield* brain.subscribe('triage', {
        selector: { _tag: 'atoms', predicate: 'wake', args: ['g4', 'triage', undefined] },
      });

      const emails = Array.from({ length: 200 }, (_, index) => ({
        id: `mail${index}`,
        subject: { entity: `sender${index % 7}` },
        predicate: 'received',
        object: { literal: 'email' },
        source: 'inbox',
      }));
      const chatter = Array.from({ length: 50 }, (_, index) =>
        utterance(`chat${index}`, 'rich', 'said', `line ${index}`),
      );
      const pushed = yield* brain.push([...emails, ...chatter]);
      expect(pushed.mode).toBe('full');

      let batches = 0;
      while (true) {
        const batch = yield* brain.take('triage', { max: 25 });
        if (batch.length === 0) {
          break;
        }
        batches++;
        const archive = batch.flatMap(({ event }) =>
          event.kind === 'derived'
            ? [{ subject: { entity: String(event.atom.args[2]) }, predicate: 'status', object: { entity: 'archived' } }]
            : [],
        );
        yield* brain.push(archive, { origin: 'triage', cause: batch.map(({ id }) => id) });
        yield* brain.ack(
          'triage',
          batch.map(({ id }) => id),
        );
      }
      expect(batches).toBe(8);
      expect(yield* brain.ask('holds(g4)')).toEqual([{}]);

      // One more email breaks the condition until it is triaged.
      yield* brain.push([{ ...emails[0], id: 'mail200' }]);
      expect(yield* brain.ask('holds(g4)')).toEqual([]);
      expect(yield* brain.take('triage')).toHaveLength(1);
    }),
  );

  it.effect(
    'goal 5: complete my taxes by April 15 (deadline, sub-goals and the task that links back)',
    Effect.fnUntraced(function* () {
      const deadline = Date.parse('2027-04-15T00:00:00Z');
      yield* TestClock.setTime(Date.parse('2027-03-01T09:00:00Z'));
      const brain = yield* Brain.make();
      yield* brain.addRules({
        id: 'goal5',
        rules: `
          goal(g5).
          deadline(g5, "2027-04-15T00:00:00Z").
          sub_goal(S, G) :- fact(_, S, sub_goal_of, G).
          done(S) :- fact(_, S, status, done).
          done(S) :- fact(_, T, task_for, S), fact(_, T, status, completed).
          pending(G) :- sub_goal(S, G), not done(S).
          achieved(G) :- goal(G), sub_goal(_, G), not pending(G).
          wake(G, remind) :- deadline(G, T), elapsed(T, -14d), not achieved(G).
          wake(G, overdue) :- deadline(G, T), elapsed(T, 0), not achieved(G).
        `,
      });
      yield* brain.register('judge');
      yield* brain.subscribe('judge', { selector: { _tag: 'atoms', predicate: 'wake', args: ['g5', undefined] } });

      // Judgment breaks the goal into sub-goals; booking the accountant becomes a Task assigned to the user.
      yield* brain.push(
        [
          link('s1', 'w2s', 'sub_goal_of', 'g5'),
          link('s2', 'last_return', 'sub_goal_of', 'g5'),
          link('s3', 'accountant', 'sub_goal_of', 'g5'),
          link('t1', 'task1', 'task_for', 'accountant'),
        ],
        { origin: 'judge' },
      );
      expect(yield* brain.ask('pending(g5)')).toEqual([{}]);
      yield* brain.push([link('s4', 'w2s', 'status', 'done'), link('s5', 'last_return', 'status', 'done')]);
      expect(yield* brain.ask('sub_goal(S, g5), not done(S)')).toEqual([{ S: 'accountant' }]);

      // Two weeks out, the reminder wakes the goal.
      yield* TestClock.setTime(deadline - 14 * DAY);
      yield* brain.tick();
      expect((yield* brain.take('judge')).map(({ event }) => secondArg(event))).toEqual(['remind']);

      // The task's completion is a fact the goal's rules match; the goal is achieved and stops reminding.
      const completed = yield* brain.push([link('t2', 'task1', 'status', 'completed')]);
      expect(yield* brain.ask('achieved(g5)')).toEqual([{}]);
      expect(completed.mode).toBe('full');
      yield* TestClock.setTime(deadline + DAY);
      yield* brain.tick();
      expect(yield* brain.ask('wake(g5, R)')).toEqual([]);
    }),
  );

  it.effect(
    'goal 6: learn French (daily cadence; the user closes it)',
    Effect.fnUntraced(function* () {
      yield* TestClock.setTime(MONDAY);
      const brain = yield* Brain.make();
      yield* brain.addRules({
        id: 'goal6',
        rules: `
          cadence(g6, 1d).
          closed(G) :- fact(_, G, status, closed).
          last_practice(G, T) :- fact(F, G, practised, _), said_at(F, T).
          due(G) :- cadence(G, D), last_practice(G, T), elapsed(T, D), not closed(G).
        `,
      });
      yield* brain.register('tutor');
      yield* brain.subscribe('tutor', { selector: { _tag: 'atoms', predicate: 'due', args: ['g6'] } });

      // Each practice session supersedes the last, so only the latest counts toward the cadence.
      const practise = (id: string, at: number, supersedes: string[]) =>
        brain.push([
          {
            id,
            subject: { entity: 'g6' },
            predicate: 'practised',
            object: { literal: 'session' },
            saidAt: new Date(at).toISOString(),
            supersedes,
          },
        ]);
      yield* practise('p1', MONDAY, []);
      const sessions: number[] = [];
      for (let day = 1; day <= 3; day++) {
        yield* TestClock.setTime(MONDAY + day * DAY - HOUR);
        yield* brain.tick();
        expect(yield* brain.take('tutor')).toEqual([]);
        yield* TestClock.setTime(MONDAY + day * DAY);
        yield* brain.tick();
        const due = yield* brain.take('tutor');
        sessions.push(due.length);
        yield* brain.ack(
          'tutor',
          due.map(({ id }) => id),
        );
        yield* practise(`p${day + 1}`, MONDAY + day * DAY, [`p${day}`]);
      }
      expect(sessions).toEqual([1, 1, 1]);

      // Achievement is fuzzy, so the user closes it; it is never due again.
      yield* brain.push([{ subject: { entity: 'g6' }, predicate: 'status', object: { entity: 'closed' } }]);
      yield* TestClock.setTime(MONDAY + 10 * DAY);
      yield* brain.tick();
      expect(yield* brain.take('tutor')).toEqual([]);
    }),
  );

  it.effect(
    'goal 7: never book meetings on Fridays (constraint checked before the action)',
    Effect.fnUntraced(function* () {
      const brain = yield* Brain.make();
      yield* brain.addRules({
        id: 'goal7',
        rules: '! no_friday_meetings :- fact(F, agent, books_meeting, friday), speaker(F, agent).',
      });

      yield* brain.push([utterance('m1', 'agent', 'books_meeting', 'thursday', { subjectEntity: 'agent' })]);
      const blocked = yield* Effect.flip(
        brain.push([utterance('m2', 'agent', 'books_meeting', 'friday', { subjectEntity: 'agent' })]),
      );
      expect(blocked).toBeInstanceOf(Brain.ConsistencyError);
      expect(blocked.context).toMatchObject({
        violations: [{ constraint: 'no_friday_meetings', bindings: { F: 'm2' } }],
      });

      // The agent rewrites the action and tries again.
      yield* brain.push([utterance('m3', 'agent', 'books_meeting', 'monday', { subjectEntity: 'agent' })]);
      expect((yield* brain.query({ predicate: 'books_meeting' })).map(({ id }) => id)).toEqual(['m1', 'm3']);
      // Someone else saying "Friday" is a fact, not the agent's action.
      yield* brain.push([utterance('m4', 'rich', 'books_meeting', 'friday', { subjectEntity: 'agent' })]);
      expect(yield* brain.violations()).toEqual([]);
    }),
  );

  it.effect(
    'goal 8: help me draft this PR description (session goal, promoted before the session ends)',
    Effect.fnUntraced(function* () {
      const brain = yield* Brain.make();
      yield* brain.register('session-42');
      yield* brain.subscribe('session-42', { selector: { _tag: 'facts', pattern: { source: 'session:42' } } });

      yield* brain.push([
        utterance('c1', 'rich', 'wants', 'summary first', { source: 'session:42' }),
        utterance('c2', 'rich', 'wants', 'unrelated', { source: 'session:43' }),
        utterance('c3', 'rich', 'wants', 'safety table', { source: 'session:42' }),
      ]);
      expect((yield* brain.take('session-42')).map(({ event }) => event.kind === 'asserted' && event.fact.id)).toEqual([
        'c1',
        'c3',
      ]);

      // "Keep watching this after we're done": a durable goal takes over with the session's history.
      yield* brain.register('durable-rich');
      yield* brain.subscribe('durable-rich', {
        selector: { _tag: 'facts', pattern: { source: 'session:42' } },
        replay: true,
      });
      expect(yield* brain.unsubscribe('session-42')).toBe(true);
      yield* brain.push([utterance('c4', 'rich', 'wants', 'shorter title', { source: 'session:42' })]);

      const durable = yield* brain.take('durable-rich');
      expect(durable.map(({ event }) => [event.kind === 'asserted' && event.fact.id, event.replay ?? false])).toEqual([
        ['c1', true],
        ['c3', true],
        ['c4', false],
      ]);
      expect(yield* Effect.flip(brain.take('session-42'))).toBeInstanceOf(Brain.UnknownRegistrationError);
    }),
  );

  it.effect(
    'sub-goals: closing a goal closes its open sub-goals, recursively',
    Effect.fnUntraced(function* () {
      const brain = yield* Brain.make();
      yield* brain.addRules({
        id: 'hierarchy',
        rules: `
          sub_goal(S, G) :- fact(_, S, sub_goal_of, G).
          done(S) :- fact(_, S, status, done).
          cancelled(G) :- fact(_, G, status, cancelled).
          cancelled(S) :- sub_goal(S, G), cancelled(G), not done(S).
        `,
      });
      yield* brain.push([
        link('h1', 'gather', 'sub_goal_of', 'taxes'),
        link('h2', 'w2s', 'sub_goal_of', 'gather'),
        link('h3', 'receipts', 'sub_goal_of', 'gather'),
        link('h4', 'accountant', 'sub_goal_of', 'taxes'),
        link('h5', 'receipts', 'status', 'done'),
      ]);
      yield* brain.push([link('h6', 'taxes', 'status', 'cancelled')]);
      expect((yield* brain.ask('cancelled(G)')).map(({ G }) => G).sort()).toEqual([
        'accountant',
        'gather',
        'taxes',
        'w2s',
      ]);
    }),
  );
});

/** Something `speaker` said, about the speaker unless `subjectEntity` says otherwise. */
const utterance = (
  id: string,
  speaker: string,
  predicate: string,
  object: string,
  { subjectEntity, ...extra }: Partial<Fact.Input> & { readonly subjectEntity?: string } = {},
): Fact.Input => ({
  id,
  speaker,
  subject: { entity: subjectEntity ?? speaker },
  predicate,
  object: { label: object },
  ...extra,
});

/** A relation between two entities, as the agent records it. */
const link = (id: string, subject: string, predicate: string, object: string): Fact.Input => ({
  id,
  subject: { entity: subject },
  predicate,
  object: { entity: object },
});

/** The second argument of a derived atom: a wake's reason (`wake(Goal, Reason, ...)`), an update's fact. */
const secondArg = (event: Event.Event) => (event.kind === 'derived' ? event.atom.args[1] : undefined);

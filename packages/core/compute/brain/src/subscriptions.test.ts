//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Brain from './Brain.ts';
import type * as Fact from './Fact.ts';

const TestLayer = Brain.layer();

describe('subscriptions', () => {
  describe('matching', () => {
    it.effect(
      'delivers new facts that match a pattern, and only those',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: { speaker: 'dima', about: 'release' } } });
        yield* brain.push([
          said('f1', 'dima', 'release', 'ships', 'friday'),
          said('f2', 'rich', 'release', 'ships', 'friday'),
          said('f3', 'dima', 'indexer', 'is', 'slow'),
        ]);

        const deliveries = yield* brain.take('rich');
        expect(deliveries.map(({ event }) => event.kind === 'asserted' && event.fact.id)).toEqual(['f1']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'does not deliver what held before subscribing',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'busy(X) :- fact(_, X, works_on, _).' });
        yield* brain.push([said('f1', 'dima', 'dima', 'works_on', 'indexer')]);
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {} } });
        yield* brain.subscribe('rich', { selector: { _tag: 'atoms', predicate: 'busy' } });
        expect(yield* brain.take('rich')).toEqual([]);

        yield* brain.push([said('f2', 'josiah', 'josiah', 'works_on', 'docs')]);
        const deliveries = yield* brain.take('rich');
        expect(deliveries.map(({ event }) => event.kind)).toEqual(['asserted', 'derived']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'replay enqueues what already holds before later changes',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'busy(X) :- fact(_, X, works_on, _).' });
        yield* brain.push([
          said('f1', 'dima', 'dima', 'works_on', 'indexer'),
          said('f2', 'rich', 'rich', 'likes', 'tea'),
        ]);
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'atoms', predicate: 'busy' }, replay: true });
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: { predicate: 'likes' } }, replay: true });
        yield* brain.push([said('f3', 'josiah', 'josiah', 'works_on', 'docs')]);

        const deliveries = yield* brain.take('rich');
        expect(deliveries.map(({ event }) => [event.kind, event.replay ?? false])).toEqual([
          ['derived', true],
          ['asserted', true],
          ['derived', false],
        ]);
        expect(deliveries[0].event).toMatchObject({ atom: { predicate: 'busy', args: ['dima'] } });
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'delivers conclusions derived through chained rules',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({
          id: 'r',
          rules: `
            parent(X, Y) :- fact(_, X, parent_of, Y).
            ancestor(X, Y) :- parent(X, Y).
            ancestor(X, Z) :- ancestor(X, Y), parent(Y, Z).
          `,
        });
        yield* brain.register('genealogist');
        yield* brain.subscribe('genealogist', {
          selector: { _tag: 'atoms', predicate: 'ancestor', args: ['ann', undefined] },
        });
        yield* brain.push([said('f1', 'x', 'ann', 'parent_of', 'bea')]);
        yield* brain.push([said('f2', 'x', 'bea', 'parent_of', 'cid'), said('f3', 'x', 'cid', 'parent_of', 'dot')]);

        const deliveries = yield* brain.take('genealogist');
        expect(deliveries.map(({ event }) => event.kind === 'derived' && event.atom.args[1])).toEqual([
          'bea',
          'cid',
          'dot',
        ]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'atom selectors match by argument position and arity',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'wake(G, R) :- fact(_, G, wake, R).' });
        yield* brain.register('judge');
        const reply = yield* brain.subscribe('judge', {
          selector: { _tag: 'atoms', predicate: 'wake', args: [undefined, 'reply'] },
        });
        yield* brain.subscribe('judge', { selector: { _tag: 'atoms', predicate: 'wake', args: ['g1'] } });
        yield* brain.push([said('f1', 'x', 'g1', 'wake', 'reply'), said('f2', 'x', 'g2', 'wake', 'refusal')]);

        const deliveries = yield* brain.take('judge');
        expect(
          deliveries.map(({ event, subscriptions }) => [event.kind === 'derived' && event.atom.args, subscriptions]),
        ).toEqual([[['g1', 'reply'], [reply]]]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'delivers retractions and withdrawn conclusions when asked',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'busy(X) :- fact(_, X, works_on, _).' });
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {}, kinds: ['retracted'] } });
        yield* brain.subscribe('rich', { selector: { _tag: 'atoms', predicate: 'busy', kinds: ['underived'] } });
        yield* brain.push([said('f1', 'dima', 'dima', 'works_on', 'indexer')]);
        yield* brain.push([said('f2', 'dima', 'dima', 'works_on', 'release', { supersedes: ['f1'] })]);
        yield* brain.retract(['f2']);

        const deliveries = yield* brain.take('rich');
        expect(
          deliveries.map(({ event }) =>
            event.kind === 'retracted'
              ? `${event.fact.id}:${event.reason}`
              : event.kind === 'underived'
                ? event.atom.predicate
                : event.kind,
          ),
        ).toEqual(['f1:superseded', 'f2:retracted', 'busy']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'violation subscriptions select by constraint',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({
          id: 'r',
          rules:
            '! double_booked :- fact(A, X, booked, T), fact(B, X, booked, T), lt(A, B). ! other :- fact(_, x, y, z).',
          onViolation: 'flag',
        });
        yield* brain.register('calendar');
        yield* brain.subscribe('calendar', { selector: { _tag: 'violations', constraint: 'double_booked' } });
        yield* brain.push([said('f1', 'rich', 'rich', 'booked', '10am'), said('f2', 'rich', 'rich', 'booked', '10am')]);
        yield* brain.push([said('f3', 'rich', 'x', 'y', 'z')]);

        const deliveries = yield* brain.take('calendar');
        expect(deliveries.map(({ event }) => event.kind === 'violated' && event.bindings)).toEqual([
          { A: 'f1', B: 'f2', X: 'rich', T: '10am' },
        ]);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('outbox', () => {
    it.effect(
      'keeps events in the order they happened across pushes',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'busy(X) :- fact(_, X, works_on, _).' });
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {} } });
        yield* brain.subscribe('rich', { selector: { _tag: 'atoms', predicate: 'busy' } });
        for (const index of [1, 2, 3]) {
          yield* brain.push([said(`f${index}`, 'x', `p${index}`, 'works_on', 'w')]);
        }

        const deliveries = yield* brain.take('rich');
        expect(deliveries.map(({ event }) => event.seq)).toEqual(
          [...deliveries.map(({ event }) => event.seq)].sort((a, b) => a - b),
        );
        expect(
          deliveries.map(({ event }) =>
            event.kind === 'asserted' ? event.fact.id : event.kind === 'derived' ? event.atom.args[0] : '',
          ),
        ).toEqual(['f1', 'p1', 'f2', 'p2', 'f3', 'p3']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'take is at-least-once: unacked deliveries come back, counting attempts',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {} } });
        yield* brain.push([said('f1', 'x', 'a', 'is', 'b'), said('f2', 'x', 'c', 'is', 'd')]);

        const first = yield* brain.take('rich');
        const second = yield* brain.take('rich');
        expect(second.map(({ id }) => id)).toEqual(first.map(({ id }) => id));
        expect(first.map(({ attempts }) => attempts)).toEqual([1, 1]);
        expect(second.map(({ attempts }) => attempts)).toEqual([2, 2]);

        expect(yield* brain.ack('rich', [first[0].id])).toBe(1);
        const third = yield* brain.take('rich');
        expect(third.map(({ id, attempts }) => [id, attempts])).toEqual([[first[1].id, 3]]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'take batches with max; ack removes only what it names and is idempotent',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {} } });
        yield* brain.push(Array.from({ length: 5 }, (_, index) => said(`f${index}`, 'x', `s${index}`, 'is', 'o')));

        const batch = yield* brain.take('rich', { max: 2 });
        expect(batch).toHaveLength(2);
        expect(
          yield* brain.ack(
            'rich',
            batch.map(({ id }) => id),
          ),
        ).toBe(2);
        expect(
          yield* brain.ack(
            'rich',
            batch.map(({ id }) => id),
          ),
        ).toBe(0);
        expect(yield* brain.ack('rich', ['e999'])).toBe(0);

        // Acking out of order leaves the rest in order.
        const rest = yield* brain.take('rich');
        expect(yield* brain.ack('rich', [rest[1].id])).toBe(1);
        expect((yield* brain.take('rich')).map(({ id }) => id)).toEqual([rest[0].id, rest[2].id]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'an event matched by several subscriptions is delivered once, naming each',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.register('rich');
        const bySpeaker = yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: { speaker: 'dima' } } });
        const byTopic = yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: { about: 'release' } } });
        yield* brain.push([said('f1', 'dima', 'release', 'ships', 'friday')]);

        const deliveries = yield* brain.take('rich');
        expect(deliveries).toHaveLength(1);
        expect(deliveries[0].subscriptions).toEqual([bySpeaker, byTopic]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'each registration has its own outbox',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        for (const id of ['rich', 'josiah']) {
          yield* brain.register(id);
          yield* brain.subscribe(id, { selector: { _tag: 'facts', pattern: { speaker: 'dima' } } });
        }
        yield* brain.push([said('f1', 'dima', 'release', 'ships', 'friday')]);

        const rich = yield* brain.take('rich');
        yield* brain.ack(
          'rich',
          rich.map(({ id }) => id),
        );
        expect(yield* brain.take('rich')).toEqual([]);
        expect((yield* brain.take('josiah')).map(({ id }) => id)).toEqual(rich.map(({ id }) => id));
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'unsubscribing stops new deliveries but keeps those already queued',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.register('rich');
        const subscription = yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {} } });
        yield* brain.push([said('f1', 'x', 'a', 'is', 'b')]);
        expect(yield* brain.unsubscribe('rich', subscription)).toBe(true);
        expect(yield* brain.unsubscribe('rich', subscription)).toBe(false);
        yield* brain.push([said('f2', 'x', 'c', 'is', 'd')]);

        const deliveries = yield* brain.take('rich');
        expect(deliveries.map(({ event }) => event.kind === 'asserted' && event.fact.id)).toEqual(['f1']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'unsubscribing a registration drops its outbox',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {} } });
        yield* brain.push([said('f1', 'x', 'a', 'is', 'b')]);
        expect(yield* brain.unsubscribe('rich')).toBe(true);
        expect(yield* brain.unsubscribe('rich')).toBe(false);
        expect(yield* Effect.flip(brain.take('rich'))).toBeInstanceOf(Brain.UnknownRegistrationError);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'an unknown registration is a typed error',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        const errors = [
          yield* Effect.flip(brain.subscribe('nobody', { selector: { _tag: 'facts', pattern: {} } })),
          yield* Effect.flip(brain.take('nobody')),
          yield* Effect.flip(brain.ack('nobody', ['e1'])),
        ];
        expect(errors.map((error) => error._tag)).toEqual([
          'UnknownRegistrationError',
          'UnknownRegistrationError',
          'UnknownRegistrationError',
        ]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'registering again keeps the outbox and subscriptions',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.register('rich', { meta: { owner: 'rich' } });
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {} } });
        yield* brain.push([said('f1', 'x', 'a', 'is', 'b')]);
        yield* brain.register('rich');
        yield* brain.push([said('f2', 'x', 'c', 'is', 'd')]);
        expect(yield* brain.take('rich')).toHaveLength(2);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a rejected push delivers nothing',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: '! no_fridays :- fact(_, _, books_meeting, friday).' });
        yield* brain.register('rich');
        yield* brain.subscribe('rich', { selector: { _tag: 'facts', pattern: {} } });
        yield* Effect.flip(brain.push([said('f1', 'agent', 'agent', 'books_meeting', 'friday')]));
        expect(yield* brain.take('rich')).toEqual([]);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('loop guards', () => {
    it.effect(
      'a registration does not hear the events its own pushes cause, unless it asks to',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'noted(F) :- fact(F, _, _, _).' });
        yield* brain.register('agent');
        yield* brain.register('auditor');
        yield* brain.subscribe('agent', { selector: { _tag: 'atoms', predicate: 'noted' } });
        yield* brain.subscribe('auditor', { selector: { _tag: 'atoms', predicate: 'noted' }, includeOwn: true });
        yield* brain.push([said('f1', 'agent', 'g3', 'relayed', 'm1')], { origin: 'agent' });
        yield* brain.push([said('f2', 'auditor', 'g3', 'checked', 'm1')], { origin: 'auditor' });

        expect((yield* brain.take('agent')).map(({ event }) => event.origin)).toEqual(['auditor']);
        expect((yield* brain.take('auditor')).map(({ event }) => event.origin)).toEqual(['agent', 'auditor']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'events carry causal depth from the events a push names as its cause',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.register('agent');
        yield* brain.subscribe('agent', { selector: { _tag: 'facts', pattern: {} }, includeOwn: true });
        const root = yield* brain.push([said('f1', 'dima', 'a', 'is', 'b')]);
        const reaction = yield* brain.push([said('f2', 'agent', 'c', 'is', 'd')], {
          origin: 'agent',
          cause: root.events,
        });
        yield* brain.push([said('f3', 'agent', 'e', 'is', 'f')], {
          origin: 'agent',
          cause: [...root.events, ...reaction.events],
        });

        expect((yield* brain.take('agent')).map(({ event }) => event.depth)).toEqual([0, 1, 2]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a feedback loop between two consumers stops at the depth limit',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.make({ maxDepth: 3 });
        yield* brain.register('ping');
        yield* brain.register('pong');
        yield* brain.subscribe('ping', { selector: { _tag: 'facts', pattern: { predicate: 'pong' } } });
        yield* brain.subscribe('pong', { selector: { _tag: 'facts', pattern: { predicate: 'ping' } } });
        yield* brain.push([said('p0', 'x', 'ball', 'ping', '0')], { origin: 'ping' });

        // Each consumer answers every event it takes with a fresh fact naming the event as its cause.
        let turn = 0;
        let error: Brain.LoopError | undefined;
        while (error === undefined && turn < 10) {
          const consumer = turn % 2 === 0 ? 'pong' : 'ping';
          const deliveries = yield* brain.take(consumer);
          for (const { id } of deliveries) {
            const reply = said(`${consumer}${turn}`, 'x', 'ball', consumer, String(turn));
            yield* brain.push([reply], { origin: consumer, cause: [id] }).pipe(
              Effect.catchTag('LoopError', (failure) =>
                Effect.sync(() => {
                  error = failure;
                }),
              ),
            );
          }
          yield* brain.ack(
            consumer,
            deliveries.map(({ id }) => id),
          );
          turn++;
        }

        expect(error).toBeInstanceOf(Brain.LoopError);
        expect(error?.context).toMatchObject({ depth: 4, maxDepth: 3 });
        expect(turn).toBe(4);
        expect(yield* brain.query({ about: 'ball' })).toHaveLength(4);
      }),
    );

    it.effect(
      're-pushing what is already known emits nothing, so an echo dies out',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'knows(X, Y) :- fact(_, X, knows, Y).' });
        yield* brain.register('echo');
        yield* brain.subscribe('echo', { selector: { _tag: 'atoms', predicate: 'knows' }, includeOwn: true });
        yield* brain.push([said('f1', 'x', 'rich', 'knows', 'dima')]);

        const [delivery] = yield* brain.take('echo');
        yield* brain.ack('echo', [delivery.id]);
        const echo = yield* brain.push([said('f1', 'x', 'rich', 'knows', 'dima')], {
          origin: 'echo',
          cause: [delivery.id],
        });
        expect(echo.events).toEqual([]);
        expect(yield* brain.take('echo')).toEqual([]);
      }, Effect.provide(TestLayer)),
    );
  });
});

/** An utterance: `speaker` said that `subject predicate object`. */
const said = (
  id: string,
  speaker: string,
  subject: string,
  predicate: string,
  object: string,
  extra: Partial<Fact.Input> = {},
): Fact.Input => ({ id, speaker, subject: { entity: subject }, predicate, object: { label: object }, ...extra });

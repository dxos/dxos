//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Semaphore from 'effect/Semaphore';

import type * as Brain from '../Brain.ts';
import * as Event from '../Event.ts';
import * as Fact from '../Fact.ts';
import * as Rule from '../Rule.ts';
import {
  type Binding,
  type Context,
  type Model,
  type Relation,
  baseAtoms,
  cloneModel,
  emptyModel,
  extend,
  findViolations,
  insert,
  keyOf,
  lookup,
  named,
  solve,
} from './engine.ts';
import { ConflictError, ConsistencyError, LoopError, UnknownRegistrationError } from './errors.ts';
import { canonicalJson } from './hash.ts';
import {
  type CompiledProgram,
  EDB_ARITY,
  EMPTY_PROGRAM,
  type RulesetSpec,
  compile,
  downstream,
  plan,
} from './program.ts';

type StoredFact = { readonly fact: Fact.Fact; readonly retracted: boolean };

type ViolationEntry = { readonly constraint: string; readonly mode: 'reject' | 'flag'; readonly bindings: Binding };

type Delivery = {
  readonly id: string;
  readonly event: Event.Event;
  readonly subscriptions: readonly string[];
  attempts: number;
};

type Registration = {
  readonly id: string;
  meta?: Readonly<Record<string, unknown>>;
  readonly subscriptions: Map<string, Event.Subscription>;
  outbox: Delivery[];
  nextSubscription: number;
};

/** What a change commits: the next fact store, program and model, with the events that describe the difference. */
type Transition = {
  readonly facts: Map<string, StoredFact>;
  readonly supersededBy: Map<string, string>;
  readonly rulesets: Map<string, RulesetSpec & { readonly source: string }>;
  readonly program: CompiledProgram;
  readonly model: Model;
  readonly active: Set<string>;
  readonly violations: Map<string, ViolationEntry>;
  readonly now: number;
  readonly mode: Brain.Mode;
  readonly derived: number;
};

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type State = Mutable<Omit<Transition, 'mode' | 'derived'>> & {
  readonly registrations: Map<string, Registration>;
  /** Causal depth of every event emitted, so a push naming its causes inherits their depth. */
  readonly depths: Map<string, number>;
  seq: number;
};

/** An event before it is stamped; distributes over the union so each kind keeps its own fields. */
type Draft = Event.Event extends infer E
  ? E extends Event.Event
    ? Omit<E, 'id' | 'seq' | 'depth' | 'origin' | 'replay'>
    : never
  : never;

const inactiveReason = (
  stored: StoredFact,
  supersededBy: ReadonlyMap<string, string>,
  now: number,
): Event.RetractReason | undefined => {
  if (stored.retracted) {
    return 'retracted';
  }
  if (supersededBy.has(stored.fact.id)) {
    return 'superseded';
  }
  const validTo = stored.fact.validTo === undefined ? Number.NaN : Date.parse(stored.fact.validTo);
  return !Number.isNaN(validTo) && validTo <= now ? 'expired' : undefined;
};

export const makeCore = Effect.fnUntraced(function* (maxDepth: number) {
  const lock = (yield* Semaphore.make(1)).withPermits(1);
  const state: State = {
    facts: new Map(),
    supersededBy: new Map(),
    rulesets: new Map(),
    program: EMPTY_PROGRAM,
    model: emptyModel(),
    active: new Set(),
    violations: new Map(),
    now: yield* Clock.currentTimeMillis,
    registrations: new Map(),
    depths: new Map(),
    seq: 0,
  };

  const contextOf = (facts: ReadonlyMap<string, StoredFact>, now: number): Context => ({
    now,
    facts: new Map([...facts].map(([id, stored]) => [id, stored.fact])),
  });

  /**
   * Re-evaluates after a change. Pure additions that no negation, aggregate or clock reading can see are joined
   * incrementally; anything that can withdraw a conclusion re-derives the model from scratch.
   */
  const evaluate = (
    next: Pick<Transition, 'facts' | 'supersededBy' | 'rulesets' | 'program'>,
    now: number,
  ): Transition => {
    const active = new Set(
      [...next.facts.values()]
        .filter((stored) => inactiveReason(stored, next.supersededBy, now) === undefined)
        .map(({ fact }) => fact.id),
    );
    const removed = [...state.active].filter((id) => !active.has(id));
    const added = [...active].filter((id) => !state.active.has(id));
    const programChanged = next.program !== state.program;
    const clockMatters = next.program.temporal && now !== state.now;
    const context = contextOf(next.facts, now);

    if (!programChanged && !clockMatters && removed.length === 0 && added.length === 0) {
      return { ...next, model: state.model, active, violations: state.violations, now, mode: 'none', derived: 0 };
    }

    const addedAtoms = added.flatMap((id) => {
      const stored = next.facts.get(id);
      return stored ? baseAtoms(stored.fact).map((atom) => ({ atom, id })) : [];
    });
    const reach = downstream(
      next.program,
      addedAtoms.map(({ atom }) => atom.predicate),
    );
    const incremental =
      !programChanged &&
      !clockMatters &&
      removed.length === 0 &&
      ![...reach].some((predicate) => next.program.nonMonotone.has(predicate));

    const model = incremental ? cloneModel(state.model) : emptyModel();
    const seedAtoms = incremental
      ? addedAtoms
      : [...next.facts.values()]
          .filter(({ fact }) => active.has(fact.id))
          .flatMap(({ fact }) => baseAtoms(fact).map((atom) => ({ atom, id: fact.id })));
    const seed = new Map<string, Relation>();
    for (const { atom, id } of seedAtoms) {
      const tuple = { args: atom.args, derivation: { _tag: 'fact', fact: id } } as const;
      if (insert(model, atom.predicate, tuple)) {
        const relation = seed.get(atom.predicate) ?? new Map();
        relation.set(keyOf(atom.args), tuple);
        seed.set(atom.predicate, relation);
      }
    }
    const derived = extend(next.program, model, seed, context);
    return {
      ...next,
      model,
      active,
      violations: findViolations(next.program, model, context),
      now,
      mode: incremental ? 'incremental' : 'full',
      derived,
    };
  };

  /** Describes a transition as events, in a fixed order: assertions, retractions, then conclusions and verdicts. */
  const diff = (transition: Transition, asserted: readonly string[]): Draft[] => {
    const drafts: Draft[] = [];
    for (const id of asserted) {
      const stored = transition.facts.get(id);
      if (stored && transition.active.has(id)) {
        drafts.push({ kind: 'asserted', fact: stored.fact });
      }
    }
    for (const id of state.active) {
      const stored = transition.facts.get(id);
      const reason = stored && inactiveReason(stored, transition.supersededBy, transition.now);
      if (stored && reason) {
        drafts.push({ kind: 'retracted', fact: stored.fact, reason });
      }
    }
    if (transition.model !== state.model) {
      for (const { predicate, key } of state.model.order) {
        const tuple = state.model.relations.get(predicate)?.get(key);
        if (tuple && !EDB_ARITY.has(predicate) && !transition.model.relations.get(predicate)?.has(key)) {
          drafts.push({ kind: 'underived', atom: { predicate, args: tuple.args } });
        }
      }
      for (const { predicate, key } of transition.model.order) {
        const tuple = transition.model.relations.get(predicate)?.get(key);
        if (tuple && !EDB_ARITY.has(predicate) && !state.model.relations.get(predicate)?.has(key)) {
          drafts.push({ kind: 'derived', atom: { predicate, args: tuple.args }, derivation: tuple.derivation });
        }
      }
    }
    for (const [key, { constraint, bindings }] of transition.violations) {
      if (!state.violations.has(key)) {
        drafts.push({ kind: 'violated', constraint, bindings });
      }
    }
    for (const [key, { constraint, bindings }] of state.violations) {
      if (!transition.violations.has(key)) {
        drafts.push({ kind: 'resolved', constraint, bindings });
      }
    }
    return drafts;
  };

  const rejectViolations = (transition: Transition): Effect.Effect<void, ConsistencyError> => {
    const rejected = [...transition.violations]
      .filter(([key, { mode }]) => mode === 'reject' && !state.violations.has(key))
      .map(([, { constraint, bindings }]) => ({ constraint, bindings }));
    return rejected.length > 0 ? Effect.fail(new ConsistencyError({ context: { violations: rejected } })) : Effect.void;
  };

  const stamp = (draft: Draft, depth: number, origin: string | undefined, replay?: boolean): Event.Event => {
    const seq = ++state.seq;
    const id = `e${seq}`;
    state.depths.set(id, depth);
    const common = { id, seq, depth, ...(origin !== undefined ? { origin } : {}), ...(replay ? { replay } : {}) };
    switch (draft.kind) {
      case 'asserted':
        return { ...common, kind: draft.kind, fact: draft.fact };
      case 'retracted':
        return { ...common, kind: draft.kind, fact: draft.fact, reason: draft.reason };
      case 'derived':
        return { ...common, kind: draft.kind, atom: draft.atom, derivation: draft.derivation };
      case 'underived':
        return { ...common, kind: draft.kind, atom: draft.atom };
      case 'violated':
      case 'resolved':
        return { ...common, kind: draft.kind, constraint: draft.constraint, bindings: draft.bindings };
    }
  };

  const deliver = (event: Event.Event) => {
    for (const registration of state.registrations.values()) {
      const matched = [...registration.subscriptions]
        .filter(
          ([, subscription]) =>
            (subscription.includeOwn === true || event.origin !== registration.id) &&
            Event.matches(subscription.selector, event),
        )
        .map(([id]) => id);
      if (matched.length > 0) {
        registration.outbox.push({ id: event.id, event, subscriptions: matched, attempts: 0 });
      }
    }
  };

  /** Commits a transition and fans its events out to every outbox. */
  const commit = (
    transition: Transition,
    asserted: readonly string[],
    depth: number,
    origin?: string,
  ): Brain.ChangeResult => {
    const drafts = diff(transition, asserted);
    state.facts = transition.facts;
    state.supersededBy = transition.supersededBy;
    state.rulesets = transition.rulesets;
    state.program = transition.program;
    state.model = transition.model;
    state.active = transition.active;
    state.violations = transition.violations;
    state.now = transition.now;
    const events = drafts.map((draft) => stamp(draft, depth, origin));
    events.forEach(deliver);
    return { events: events.map(({ id }) => id), mode: transition.mode, derived: transition.derived };
  };

  const depthOf = (cause: readonly string[] | undefined): Effect.Effect<number, LoopError> => {
    if (cause === undefined || cause.length === 0) {
      return Effect.succeed(0);
    }
    const depth = Math.max(...cause.map((id) => state.depths.get(id) ?? 0)) + 1;
    return depth > maxDepth
      ? Effect.fail(new LoopError({ context: { depth, maxDepth, cause } }))
      : Effect.succeed(depth);
  };

  const registrationOf = (id: string): Effect.Effect<Registration, UnknownRegistrationError> => {
    const registration = state.registrations.get(id);
    return registration
      ? Effect.succeed(registration)
      : Effect.fail(new UnknownRegistrationError({ context: { registration: id } }));
  };

  const prove = (atom: Rule.GroundAtom, visiting: Set<string>): Brain.Proof | undefined => {
    const tuple = lookup(state.model, atom);
    const key = `${atom.predicate}:${keyOf(atom.args)}`;
    if (!tuple || visiting.has(key)) {
      return undefined;
    }
    const derivation = tuple.derivation;
    if (derivation._tag === 'fact') {
      const stored = state.facts.get(derivation.fact);
      return stored && { _tag: 'fact', atom, fact: stored.fact };
    }
    const rule = state.program.rules.find(({ id }) => id === derivation.rule);
    visiting.add(key);
    const premises = derivation.premises.flatMap((premise) => prove(premise, visiting) ?? []);
    visiting.delete(key);
    return { _tag: 'rule', atom, rule: derivation.rule, text: rule?.text ?? '', premises };
  };

  /** Rebuilds the program from rulesets and re-derives everything. */
  const recompile = (rulesets: Map<string, RulesetSpec & { readonly source: string }>) =>
    Effect.gen(function* () {
      const program = yield* compile([...rulesets.values()]);
      return evaluate(
        { facts: state.facts, supersededBy: state.supersededBy, rulesets, program },
        yield* Clock.currentTimeMillis,
      );
    });

  const replayDrafts = (selector: Event.Selector): Draft[] => {
    switch (selector._tag) {
      case 'facts':
        return (selector.kinds ?? ['asserted']).includes('asserted')
          ? [...state.facts.values()]
              .filter(({ fact }) => state.active.has(fact.id) && Fact.matches(selector.pattern, fact))
              .map(({ fact }) => ({ kind: 'asserted', fact }))
          : [];
      case 'atoms':
        return (selector.kinds ?? ['derived']).includes('derived')
          ? [...(state.model.relations.get(selector.predicate)?.values() ?? [])]
              .filter(({ args }) => Event.matchesArgs(selector.args, args))
              .map((tuple) => ({
                kind: 'derived',
                atom: { predicate: selector.predicate, args: tuple.args },
                derivation: tuple.derivation,
              }))
          : [];
      case 'violations':
        return (selector.kinds ?? ['violated']).includes('violated')
          ? [...state.violations.values()]
              .filter(({ constraint }) => selector.constraint === undefined || selector.constraint === constraint)
              .map(({ constraint, bindings }) => ({ kind: 'violated', constraint, bindings }))
          : [];
    }
  };

  const service: Brain.Service = {
    push: (inputs, options = {}) =>
      lock(
        Effect.gen(function* () {
          const incoming = yield* Effect.forEach(inputs, (input) => Fact.make(input));
          const depth = yield* depthOf(options.cause);
          const facts = new Map(state.facts);
          const supersededBy = new Map(state.supersededBy);
          const added: string[] = [];
          const duplicates: string[] = [];
          for (const fact of incoming) {
            const held = facts.get(fact.id);
            if (held) {
              if (!Fact.equals(held.fact, fact)) {
                return yield* Effect.fail(new ConflictError({ context: { id: fact.id } }));
              }
              duplicates.push(fact.id);
              continue;
            }
            facts.set(fact.id, { fact, retracted: false });
            added.push(fact.id);
            for (const target of fact.supersedes ?? []) {
              if (target !== fact.id && !supersededBy.has(target)) {
                supersededBy.set(target, fact.id);
              }
            }
          }
          const transition = evaluate(
            { facts, supersededBy, rulesets: state.rulesets, program: state.program },
            yield* Clock.currentTimeMillis,
          );
          yield* rejectViolations(transition);
          return { ...commit(transition, added, depth, options.origin), added, duplicates };
        }),
      ),

    retract: (ids, options = {}) =>
      lock(
        Effect.gen(function* () {
          const unknown = ids.filter((id) => !state.facts.has(id));
          if (unknown.length > 0) {
            return yield* Effect.fail(
              new Fact.ValidationError({ message: 'No fact has that id.', context: { unknown } }),
            );
          }
          const depth = yield* depthOf(options.cause);
          const facts = new Map(state.facts);
          const retracted: string[] = [];
          for (const id of ids) {
            const stored = facts.get(id);
            if (stored && !stored.retracted) {
              facts.set(id, { ...stored, retracted: true });
              retracted.push(id);
            }
          }
          const transition = evaluate(
            { facts, supersededBy: state.supersededBy, rulesets: state.rulesets, program: state.program },
            yield* Clock.currentTimeMillis,
          );
          yield* rejectViolations(transition);
          return { ...commit(transition, [], depth, options.origin), retracted };
        }),
      ),

    query: (pattern = {}, options = {}) =>
      Effect.sync(() =>
        [...state.facts.values()]
          .filter(({ fact }) => (options.inactive === true || state.active.has(fact.id)) && Fact.matches(pattern, fact))
          .map(({ fact }) => fact),
      ),

    ask: (query) =>
      Effect.gen(function* () {
        const steps = yield* plan(yield* Rule.parseQuery(query), query);
        const seen = new Set<string>();
        const results: Readonly<Record<string, Rule.Value>>[] = [];
        for (const { binding } of solve(steps, state.model, contextOf(state.facts, state.now))) {
          const bindings = named(binding);
          const key = canonicalJson(bindings);
          if (!seen.has(key)) {
            seen.add(key);
            results.push(bindings);
          }
        }
        return results;
      }),

    explain: (atom) => Effect.sync(() => Option.fromNullishOr(prove(atom, new Set()))),

    violations: () =>
      Effect.sync(() => [...state.violations.values()].map(({ constraint, bindings }) => ({ constraint, bindings }))),

    addRules: ({ id, rules, onViolation = 'reject' }) =>
      lock(
        Effect.gen(function* () {
          const held = state.rulesets.get(id);
          if (held && held.source === rules && held.onViolation === onViolation) {
            const unchanged: Brain.ChangeResult = { events: [], mode: 'none', derived: 0 };
            return unchanged;
          }
          const program = yield* Rule.parse(rules);
          const transition = yield* recompile(
            new Map(state.rulesets).set(id, { id, program, onViolation, source: rules }),
          );
          yield* rejectViolations(transition);
          return commit(transition, [], 0);
        }),
      ),

    removeRules: (id) =>
      lock(
        Effect.gen(function* () {
          if (!state.rulesets.has(id)) {
            return false;
          }
          const rulesets = new Map(state.rulesets);
          rulesets.delete(id);
          // A subset of a stratified program is stratified, so this cannot fail; orDie keeps the signature honest.
          commit(yield* recompile(rulesets).pipe(Effect.orDie), [], 0);
          return true;
        }),
      ),

    tick: () =>
      lock(
        Effect.gen(function* () {
          const transition = evaluate(
            { facts: state.facts, supersededBy: state.supersededBy, rulesets: state.rulesets, program: state.program },
            yield* Clock.currentTimeMillis,
          );
          return commit(transition, [], 0);
        }),
      ),

    register: (id, options = {}) =>
      lock(
        Effect.sync(() => {
          const held = state.registrations.get(id);
          if (held) {
            held.meta = options.meta ?? held.meta;
          } else {
            state.registrations.set(id, {
              id,
              meta: options.meta,
              subscriptions: new Map(),
              outbox: [],
              nextSubscription: 0,
            });
          }
        }),
      ),

    subscribe: (registrationId, subscription) =>
      lock(
        Effect.gen(function* () {
          const registration = yield* registrationOf(registrationId);
          const id = `${registration.id}/s${++registration.nextSubscription}`;
          registration.subscriptions.set(id, subscription);
          if (subscription.replay === true) {
            for (const draft of replayDrafts(subscription.selector)) {
              const event = stamp(draft, 0, undefined, true);
              registration.outbox.push({ id: event.id, event, subscriptions: [id], attempts: 0 });
            }
          }
          return id;
        }),
      ),

    take: (registrationId, options = {}) =>
      lock(
        Effect.gen(function* () {
          const registration = yield* registrationOf(registrationId);
          const taken = registration.outbox.slice(0, options.max ?? registration.outbox.length);
          return taken.map((delivery) => {
            delivery.attempts++;
            return { ...delivery };
          });
        }),
      ),

    ack: (registrationId, ids) =>
      lock(
        Effect.gen(function* () {
          const registration = yield* registrationOf(registrationId);
          const acked = new Set(ids);
          const before = registration.outbox.length;
          registration.outbox = registration.outbox.filter(({ id }) => !acked.has(id));
          return before - registration.outbox.length;
        }),
      ),

    unsubscribe: (registrationId, subscription) =>
      lock(
        Effect.sync(() => {
          const registration = state.registrations.get(registrationId);
          if (!registration) {
            return false;
          }
          return subscription === undefined
            ? state.registrations.delete(registrationId)
            : registration.subscriptions.delete(subscription);
        }),
      ),
  };

  return service;
});

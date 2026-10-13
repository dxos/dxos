//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Ast from '@dxos/datalog/Ast';
import * as Engine from '@dxos/datalog/Engine';
import { BaseError } from '@dxos/errors';
import { RDF } from '@dxos/pipeline-rdf';

import * as Builtins from './Builtins.ts';
import * as Compiler from './Compiler.ts';
import * as Encoding from './Encoding.ts';
import type * as Vocabulary from './Vocabulary.ts';

/**
 * Size of the evaluator's working memory: past it the oldest facts retire, so a goal that runs
 * indefinitely keeps a bounded engine, text and entity index (and bounded queries over them).
 */
export const MAX_FACTS = 10_000;

/** Most sub-goals one evaluator tracks; sub-goals are structural, so exceeding it is an error. */
export const MAX_SUBGOALS = 256;

/** Thrown by `GoalRules.update` when an input would take the evaluator past {@link MAX_SUBGOALS}. */
export class CapacityError extends BaseError.extend('CapacityError', 'Goal evaluator capacity exceeded') {
  constructor(context: { readonly max: number; readonly requested: number }) {
    super({ message: `Goal evaluator would hold ${context.requested} sub-goals; the cap is ${context.max}.`, context });
  }
}

/** A reason to run judgment on the goal. */
export type Wake = {
  /** The wake rule's label, `achieved`, or the sub-goal whose status changed. */
  readonly label: string;
  readonly cause: 'rule' | 'achieved' | 'subgoal';
  /** Ids of the facts the waking derivation rests on. */
  readonly facts: ReadonlyArray<string>;
};

export type Evaluation = {
  readonly at: number;
  readonly wakes: ReadonlyArray<Wake>;
  readonly achieved: boolean;
  readonly holds: boolean;
};

/** An action the agent proposes, checked against the goal's `blocks` rules before it runs. */
export type Action = {
  readonly id: string;
  readonly kind: string;
  readonly args: Readonly<Record<string, string>>;
};

export type ActionCheck = {
  readonly blocked: boolean;
  /** Ids of the facts that contributed to the block (empty when only the action did). */
  readonly facts: ReadonlyArray<string>;
};

export type Options = {
  readonly source: string;
  /** When the goal was created (epoch ms); also the clock's starting time. */
  readonly createdAt: number;
  readonly vocabulary?: Vocabulary.Vocabulary;
  readonly text?: Builtins.TextIndex;
  readonly entities?: Builtins.EntityIndex;
  /** Entities a fact concerns; defaults to its subject. */
  readonly concerns?: (fact: RDF.Fact) => ReadonlyArray<string>;
  /**
   * Working-memory size; defaults to {@link MAX_FACTS}. Each `update` first retires facts whose
   * `assertion.validTo` is before the clock, then the oldest (by `generatedAtTime`, then arrival)
   * until at most `maxFacts` remain. Retiring drops a fact from the evaluator only; the feed and any
   * external index keep it, and a re-sent fact with a retired id is admitted again as new.
   * Retirement never wakes the goal, and the facts behind the current `achieved` derivation are
   * never retired, so a goal stays achieved once it is; `holds` and wake bindings may lapse as
   * their facts retire, and a lapsed binding wakes again when new facts restore it.
   */
  readonly maxFacts?: number;
  /** Overrides {@link MAX_SUBGOALS}. */
  readonly maxSubgoals?: number;
};

export type Input = {
  /** Evaluation time (epoch ms); a change re-evaluates time built-ins. */
  readonly at: number;
  readonly facts?: ReadonlyArray<RDF.Fact>;
  /** Current status of each sub-goal; a new id adds the sub-goal. */
  readonly subgoals?: Readonly<Record<string, string>>;
};

/**
 * Evaluates one goal's compiled rules over a growing fact stream and a clock. A goal wakes when a
 * wake rule gains a new binding, when `achieved` first becomes true, and when a sub-goal's status
 * changes.
 */
export class GoalRules {
  readonly compilation: Compiler.Compilation;
  readonly #engine: Engine.Engine;
  readonly #vocabulary: Vocabulary.Vocabulary;
  readonly #text: Builtins.TextIndex;
  readonly #entities: Builtins.EntityIndex;
  readonly #concerns: (fact: RDF.Fact) => ReadonlyArray<string>;
  /** Working memory in arrival order. */
  readonly #facts = new Map<string, Admitted>();
  readonly #subgoals = new Map<string, string>();
  readonly #maxFacts: number;
  readonly #maxSubgoals: number;
  readonly #createdAt: number;
  #now: number;
  #previous: number;
  #achieved = false;
  #sequence = 0;

  /** @throws Compiler.CompileError if the rules do not compile. */
  constructor(options: Options) {
    this.#createdAt = options.createdAt;
    this.#now = options.createdAt;
    this.#previous = options.createdAt;
    this.#maxFacts = options.maxFacts ?? MAX_FACTS;
    this.#maxSubgoals = options.maxSubgoals ?? MAX_SUBGOALS;
    this.#vocabulary = options.vocabulary ?? Compiler.defaultVocabulary();
    this.#text = options.text ?? new Builtins.KeywordIndex();
    this.#entities = options.entities ?? new Builtins.MemoryEntityIndex();
    this.#concerns = options.concerns ?? ((fact) => [RDF.termValue(fact.assertion.subject)]);
    const builtins = Builtins.make({
      clock: {
        now: () => this.#now,
        previous: () => this.#previous,
        createdAt: options.createdAt,
        saidAt: (factId) => this.#facts.get(factId)?.saidAt,
      },
      text: this.#text,
      entities: this.#entities,
    });
    this.compilation = Compiler.compileOrThrow(options.source, { vocabulary: this.#vocabulary, builtins });
    this.#engine = Engine.make({ program: this.compilation.program, builtins, relations: Compiler.RELATIONS });
    this.#achieved = this.achieved;
  }

  get achieved(): boolean {
    return this.#engine.has('achieved', ['goal']);
  }

  get holds(): boolean {
    return this.#engine.has('holds', ['goal']);
  }

  /**
   * Adds facts and sub-goal status at time `at`, retiring facts past the working-memory window
   * (see {@link Options.maxFacts}); returns the wakes and the goal's state.
   * @throws CapacityError if the input would exceed the sub-goal cap; nothing is applied.
   */
  update({ at, facts = [], subgoals = {} }: Input): Evaluation {
    this.#checkSubgoals(subgoals);
    this.#previous = this.#now;
    this.#now = at;

    const arrived = new Map<string, { fact: RDF.Fact; admitted: Admitted }>();
    for (const fact of facts) {
      if (!this.#facts.has(fact.id) && !arrived.has(fact.id)) {
        arrived.set(fact.id, { fact, admitted: this.#admit(fact) });
      }
    }
    const retired = this.#retire([...arrived.values()].map(({ admitted }) => admitted));
    const retiring: Engine.Entry[] = [];
    for (const id of retired) {
      const admitted = this.#facts.get(id);
      if (admitted) {
        retiring.push(...admitted.entries);
        this.#facts.delete(id);
        this.#text.remove(id);
        this.#entities.remove(id);
      }
    }
    if (retiring.length > 0) {
      // A separate pass whose changes are discarded, so retirement never wakes the goal.
      this.#engine.update({ retract: retiring });
    }

    const insert: Engine.Entry[] = [];
    const retract: Engine.Entry[] = [];
    for (const { fact, admitted } of arrived.values()) {
      if (!retired.has(fact.id)) {
        this.#facts.set(fact.id, admitted);
        this.#text.add(fact.id, factText(fact));
        this.#entities.add(fact.id, this.#concerns(fact));
        insert.push(...admitted.entries);
      }
    }

    const wakes: Wake[] = [];
    for (const [subgoal, status] of Object.entries(subgoals)) {
      const previous = this.#subgoals.get(subgoal);
      if (previous === status) {
        continue;
      }
      if (previous === undefined) {
        insert.push({ relation: 'subgoal', tuple: ['goal', subgoal] });
      } else {
        retract.push({ relation: 'status', tuple: [subgoal, previous] });
        wakes.push({ label: subgoal, cause: 'subgoal', facts: [] });
      }
      insert.push({ relation: 'status', tuple: [subgoal, status] });
      this.#subgoals.set(subgoal, status);
    }

    const refresh = this.#now !== this.#previous;
    if (refresh) {
      // Re-evaluate at the previous time with no period boundary crossed, discarding the changes: otherwise a
      // binding `every` held at the previous evaluation is still present, and the next boundary adds nothing new.
      const now = this.#now;
      this.#now = this.#previous;
      this.#engine.update({ refresh: true });
      this.#now = now;
    }
    const changes = this.#engine.update({ insert, retract, refresh });
    for (const [relation, label] of this.compilation.wakes) {
      for (const tuple of changes.added.get(relation) ?? []) {
        wakes.push({ label, cause: 'rule', facts: Encoding.factIds(this.#engine.provenance(relation, tuple)) });
      }
    }

    const achieved = this.achieved;
    if (achieved && !this.#achieved) {
      wakes.push({
        label: 'achieved',
        cause: 'achieved',
        facts: Encoding.factIds(this.#engine.provenance('achieved', ['goal'])),
      });
    }
    this.#achieved = achieved;
    return { at, wakes, achieved, holds: this.holds };
  }

  #checkSubgoals(subgoals: Readonly<Record<string, string>>): void {
    const requested = this.#subgoals.size + Object.keys(subgoals).filter((id) => !this.#subgoals.has(id)).length;
    if (requested > this.#maxSubgoals) {
      throw new CapacityError({ max: this.#maxSubgoals, requested });
    }
  }

  #admit(fact: RDF.Fact): Admitted {
    const validTo = fact.assertion.validTo === undefined ? undefined : Date.parse(fact.assertion.validTo);
    return {
      id: fact.id,
      sequence: this.#sequence++,
      saidAt: Date.parse(fact.attribution.generatedAtTime),
      validTo: validTo === undefined || Number.isNaN(validTo) ? undefined : validTo,
      entries: Encoding.encode(fact, this.#vocabulary),
    };
  }

  /** Ids to retire from working memory plus the arriving facts: expired first, then oldest past the cap. */
  #retire(arriving: ReadonlyArray<Admitted>): Set<string> {
    const pinned = new Set(this.achieved ? Encoding.factIds(this.#engine.provenance('achieved', ['goal'])) : []);
    const retired = new Set<string>();
    const kept: Admitted[] = [];
    for (const admitted of [...this.#facts.values(), ...arriving]) {
      if (!pinned.has(admitted.id) && admitted.validTo !== undefined && admitted.validTo < this.#now) {
        retired.add(admitted.id);
      } else {
        kept.push(admitted);
      }
    }
    let excess = kept.length - this.#maxFacts;
    if (excess > 0) {
      const oldest = kept
        .filter(({ id }) => !pinned.has(id))
        .sort((a, b) => age(a.saidAt) - age(b.saidAt) || a.sequence - b.sequence);
      for (const { id } of oldest) {
        if (excess-- <= 0) {
          break;
        }
        retired.add(id);
      }
    }
    return retired;
  }

  /**
   * The earliest time after the last evaluation at which a time built-in can change its answer
   * (`elapsed`, `every`, `due`), so a host schedules its next {@link update} rather than polling;
   * `undefined` when the rules read no clock.
   */
  nextDueAt(): number | undefined {
    const candidates: number[] = [];
    const after = (time: number | undefined) => {
      if (time !== undefined && time > this.#now) {
        candidates.push(time);
      }
    };
    const constant = (term: Ast.Term | undefined): Ast.Value | undefined =>
      term?.type === 'constant' ? term.value : undefined;
    const visit = (literal: Ast.Literal): void => {
      if (literal.type === 'aggregate') {
        literal.body.forEach(visit);
        return;
      }
      if (literal.type !== 'atom') {
        return;
      }
      const [first, second] = literal.atom.terms;
      switch (literal.atom.predicate) {
        case 'elapsed': {
          const length = Builtins.parseDuration(constant(second) ?? '');
          if (length === undefined) {
            return;
          }
          const ref = constant(first);
          if (ref === undefined) {
            // `elapsed(F, …)` over facts: each fact in working memory starts its own clock.
            for (const { saidAt } of this.#facts.values()) {
              after(saidAt + length);
            }
          } else if (ref === 'goal') {
            after(this.#createdAt + length);
          } else {
            const start = this.#facts.get(String(ref))?.saidAt ?? Builtins.parseTime(ref);
            after(start === undefined ? undefined : start + length);
          }
          return;
        }
        case 'every': {
          const period = Builtins.parseDuration(constant(first) ?? '');
          if (period !== undefined && period > 0) {
            after(this.#createdAt + (Math.floor((this.#now - this.#createdAt) / period) + 1) * period);
          }
          return;
        }
        case 'due': {
          const deadline = Builtins.parseTime(constant(first) ?? '');
          const lead = Builtins.parseDuration(constant(second) ?? '');
          after(deadline === undefined || lead === undefined ? undefined : deadline - lead);
          return;
        }
      }
    };
    for (const rule of this.compilation.program.rules) {
      rule.body.forEach(visit);
    }
    return candidates.length === 0 ? undefined : Math.min(...candidates);
  }

  /** Evaluates the `blocks` rules for a proposed action without keeping it. */
  checkAction(action: Action): ActionCheck {
    const entries: Engine.Entry[] = [
      { relation: 'action', tuple: [action.id, action.kind] },
      ...Object.entries(action.args).map(([key, value]) => ({ relation: 'actionArg', tuple: [action.id, key, value] })),
    ];
    this.#engine.update({ insert: entries });
    const tuple: Ast.Tuple = [action.id];
    const blocked = this.#engine.has('blocks', tuple);
    const facts = blocked ? Encoding.factIds(this.#engine.provenance('blocks', tuple)) : [];
    this.#engine.update({ retract: entries });
    return { blocked, facts };
  }
}

/** A fact in working memory, with what retirement needs to order and retract it. */
type Admitted = {
  readonly id: string;
  /** Arrival order, the tie-break between facts said at the same time. */
  readonly sequence: number;
  readonly saidAt: number;
  readonly validTo?: number;
  readonly entries: ReadonlyArray<Engine.Entry>;
};

/** An unparseable `generatedAtTime` sorts as oldest. */
const age = (saidAt: number): number => (Number.isNaN(saidAt) ? Number.NEGATIVE_INFINITY : saidAt);

/** Creates a goal evaluator. */
export const make = (options: Options): GoalRules => new GoalRules(options);

/** A term's id and, for an entity known by an opaque id (a DID), its label, so `about` matches the name. */
const termText = (term: RDF.Term): string =>
  term.kind === 'entity' && term.label !== undefined ? `${term.entity} ${term.label}` : RDF.termValue(term);

/** The text `about` matches: what was said plus the triple. */
const factText = ({ assertion }: RDF.Fact): string =>
  [assertion.quote ?? '', termText(assertion.subject), assertion.predicate, termText(assertion.object)].join(' ');

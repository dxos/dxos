//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Ast from '@dxos/datalog/Ast';
import * as Engine from '@dxos/datalog/Engine';

import * as Builtins from './Builtins.ts';
import * as Compiler from './Compiler.ts';
import * as Encoding from './Encoding.ts';
import * as FactTuple from './FactTuple.ts';
import type * as Vocabulary from './Vocabulary.ts';

/** A reason to run judgment on the goal. */
export type Wake = {
  /** The wake rule's label, `achieved`, or the sub-goal whose status changed. */
  readonly label: string;
  readonly cause: 'rule' | 'achieved' | 'subgoal';
  /** Ids of the fact tuples the waking derivation rests on. */
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
  /** Ids of the fact tuples that contributed to the block (empty when only the action did). */
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
  readonly concerns?: (fact: FactTuple.FactTuple) => ReadonlyArray<string>;
};

export type Input = {
  /** Evaluation time (epoch ms); a change re-evaluates time built-ins. */
  readonly at: number;
  readonly facts?: ReadonlyArray<FactTuple.FactTuple>;
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
  readonly #concerns: (fact: FactTuple.FactTuple) => ReadonlyArray<string>;
  readonly #saidAt = new Map<string, number>();
  readonly #subgoals = new Map<string, string>();
  #now: number;
  #previous: number;
  #achieved = false;

  /** @throws Compiler.CompileError if the rules do not compile. */
  constructor(options: Options) {
    this.#now = options.createdAt;
    this.#previous = options.createdAt;
    this.#vocabulary = options.vocabulary ?? Compiler.defaultVocabulary();
    this.#text = options.text ?? new Builtins.KeywordIndex();
    this.#entities = options.entities ?? new Builtins.MemoryEntityIndex();
    this.#concerns = options.concerns ?? ((fact) => [FactTuple.termValue(fact.subject)]);
    const builtins = Builtins.make({
      clock: {
        now: () => this.#now,
        previous: () => this.#previous,
        createdAt: options.createdAt,
        saidAt: (factId) => this.#saidAt.get(factId),
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

  /** Adds facts and sub-goal status at time `at`; returns the wakes and the goal's state. */
  update({ at, facts = [], subgoals = {} }: Input): Evaluation {
    this.#previous = this.#now;
    this.#now = at;
    const insert: Engine.Entry[] = [];
    const retract: Engine.Entry[] = [];
    for (const fact of facts) {
      this.#saidAt.set(fact.id, Date.parse(fact.saidAt));
      this.#text.add(fact.id, factText(fact));
      this.#entities.add(fact.id, this.#concerns(fact));
      insert.push(...Encoding.encode(fact, this.#vocabulary));
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

    const changes = this.#engine.update({ insert, retract, refresh: this.#now !== this.#previous });
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

/** Creates a goal evaluator. */
export const make = (options: Options): GoalRules => new GoalRules(options);

/** The text `about` matches: what was said plus the triple. */
const factText = (fact: FactTuple.FactTuple): string =>
  [fact.quote ?? '', FactTuple.termValue(fact.subject), fact.predicate, FactTuple.termValue(fact.object)].join(' ');

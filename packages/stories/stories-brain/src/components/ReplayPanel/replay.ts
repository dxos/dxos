//
// Copyright 2026 DXOS.org
//

import * as Builtins from '@dxos/brain/Builtins';
import * as Compiler from '@dxos/brain/Compiler';
import * as GoalRules from '@dxos/brain/GoalRules';
import { type Expectation, type Scenario, type ScenarioFact, simulate, toFactTuple } from '@dxos/brain/testing';

/** A fact as the replay shows and the custom form enters it. */
export type ReplayFact = Pick<ScenarioFact, 'speaker' | 'quote' | 'force' | 'polarity'> & {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
};

export type ReplayStep = {
  readonly id: string;
  readonly at: string;
  readonly note: string;
  readonly facts: ReadonlyArray<ReplayFact & { readonly id: string }>;
  /** Proposed actions checked against `blocks`, as `kind key=value …`. */
  readonly actions: ReadonlyArray<string>;
  /** Absent for custom events, which have nothing to check against. */
  readonly expected?: Expectation;
  readonly wakes: ReadonlyArray<GoalRules.Wake>;
  readonly achieved: boolean;
  readonly holds: boolean;
  readonly blocks: boolean;
  readonly status: 'pass' | 'fail' | 'info';
  readonly failures: ReadonlyArray<string>;
};

export type Replay = {
  readonly steps: ReadonlyArray<ReplayStep>;
  /** Every failed expectation, including the scenario-wide time-driven wake groups. */
  readonly failures: ReadonlyArray<string>;
  /** Set when the rules do not compile, in which case nothing was replayed. */
  readonly error?: string;
};

/** A user-driven event in custom mode. */
export type ReplayEvent =
  | { readonly type: 'fact'; readonly fact: ReplayFact }
  | { readonly type: 'advance'; readonly duration: string };

/** Replays an example scenario against `source`, checking each step's expectations. */
export const replayScenario = (scenario: Scenario, source: string): Replay => {
  const result = simulate(scenario, source);
  if (result.steps.length === 0) {
    return { steps: [], failures: result.failures, error: result.failures.join('\n') };
  }
  const steps = scenario.steps.map((step, index): ReplayStep => {
    const actual = result.steps[index];
    return {
      id: step.id,
      at: step.at,
      note: step.note,
      facts: (step.facts ?? []).map(({ id, speaker, quote, s, p, o, force, polarity }) => ({
        id,
        speaker,
        quote,
        subject: s,
        predicate: p,
        object: o,
        force,
        polarity,
      })),
      actions: (step.actions ?? []).map(
        ({ kind, args }) =>
          `${kind} ${Object.entries(args)
            .map(([key, value]) => `${key}=${value}`)
            .join(' ')}`,
      ),
      expected: step.expect,
      wakes: actual.wakes,
      achieved: actual.achieved,
      holds: actual.holds,
      blocks: actual.blocks,
      status: actual.failures.length === 0 ? 'pass' : 'fail',
      failures: actual.failures,
    };
  });
  return { steps, failures: result.failures };
};

const FACT_SPACING = 60_000;

/** Replays user-entered facts and clock advances against `source`, from a goal created at `createdAt`. */
export const replayCustom = (source: string, createdAt: string, events: ReadonlyArray<ReplayEvent>): Replay => {
  let rules: GoalRules.GoalRules;
  try {
    rules = GoalRules.make({ source, createdAt: Date.parse(createdAt) });
  } catch (error) {
    if (error instanceof Compiler.CompileError) {
      return { steps: [], failures: [], error: error.diagnostics.map(Compiler.formatDiagnostic).join('\n') };
    }
    throw error;
  }

  let now = Date.parse(createdAt);
  const steps = events.map((event, index): ReplayStep => {
    const id = `e${index + 1}`;
    now += event.type === 'fact' ? FACT_SPACING : (Builtins.parseDuration(event.duration) ?? 0);
    const at = new Date(now).toISOString();
    const facts = event.type === 'fact' ? [{ ...event.fact, id: `c${index + 1}` }] : [];
    const evaluation = rules.update({
      at: now,
      facts: facts.map((fact) =>
        toFactTuple(
          {
            id: fact.id,
            speaker: fact.speaker,
            quote: fact.quote,
            s: fact.subject,
            p: fact.predicate,
            o: fact.object,
            force: fact.force,
            polarity: fact.polarity,
            mood: fact.polarity === '?' ? 'interrogative' : 'declarative',
            source: 'chat:general',
            factuality: fact.polarity === '?' ? 'Uu' : fact.polarity === '-' ? 'CT-' : 'CT+',
          },
          at,
        ),
      ),
    });
    return {
      id,
      at,
      note: event.type === 'fact' ? `${event.fact.speaker} said` : `advance ${event.duration}`,
      facts,
      actions: [],
      wakes: evaluation.wakes,
      achieved: evaluation.achieved,
      holds: evaluation.holds,
      blocks: false,
      status: 'info',
      failures: [],
    };
  });
  return { steps, failures: [] };
};

//
// Copyright 2026 DXOS.org
//

import * as Compiler from '../Compiler.ts';
import type * as FactTuple from '../FactTuple.ts';
import * as GoalRules from '../GoalRules.ts';
import type * as Vocabulary from '../Vocabulary.ts';
import { type Scenario, type ScenarioFact, type Step } from './scenarios.ts';

export type StepResult = {
  readonly id: string;
  readonly wake: boolean;
  readonly labels: ReadonlyArray<string>;
  readonly achieved: boolean;
  readonly holds: boolean;
  readonly blocks: boolean;
};

export type SimulationResult = {
  readonly ok: boolean;
  readonly steps: ReadonlyArray<StepResult>;
  readonly failures: ReadonlyArray<string>;
};

/** Converts a scripted fact to a tuple said at `saidAt`. */
export const toFactTuple = (fact: ScenarioFact, saidAt: string): FactTuple.FactTuple => ({
  id: fact.id,
  subject: { entity: fact.s },
  predicate: fact.p,
  object: { entity: fact.o },
  quote: fact.quote,
  factuality: fact.factuality,
  polarity: fact.polarity,
  force: fact.force,
  mood: fact.mood,
  speaker: fact.speaker,
  source: fact.source,
  saidAt,
  recordedAt: saidAt,
  extractor: { id: 'scenario', model: 'none', version: '1' },
  sourceHash: fact.id,
  pass: 'scenario',
});

/**
 * Replays a scenario against compiled goal rules and checks every step's expectations; a
 * compile error or a runtime error is reported as a failure.
 */
export const simulate = (
  scenario: Scenario,
  source: string,
  options: { vocabulary?: Vocabulary.Vocabulary } = {},
): SimulationResult => {
  const concerns = new Map<string, ReadonlyArray<string>>();
  for (const step of scenario.steps) {
    for (const fact of step.facts ?? []) {
      concerns.set(fact.id, fact.concerns ?? [fact.s]);
    }
  }

  let rules: GoalRules.GoalRules;
  try {
    rules = GoalRules.make({
      source,
      createdAt: Date.parse(scenario.createdAt),
      vocabulary: options.vocabulary,
      concerns: (fact) => concerns.get(fact.id) ?? [],
    });
  } catch (error) {
    if (error instanceof Compiler.CompileError) {
      return { ok: false, steps: [], failures: error.diagnostics.map(Compiler.formatDiagnostic) };
    }
    throw error;
  }

  const statuses: Record<string, string> = {};
  const steps = scenario.steps.map((step): StepResult => {
    for (const subgoal of step.subgoals ?? []) {
      statuses[subgoal] = 'active';
    }
    Object.assign(statuses, step.status ?? {});
    const evaluation = rules.update({
      at: Date.parse(step.at),
      facts: (step.facts ?? []).map((fact) => toFactTuple(fact, step.at)),
      subgoals: { ...statuses },
    });
    const blocks = (step.actions ?? []).some((action) => rules.checkAction(action).blocked);
    return {
      id: step.id,
      wake: evaluation.wakes.length > 0,
      labels: evaluation.wakes.map(({ label }) => label),
      achieved: evaluation.achieved,
      holds: evaluation.holds,
      blocks,
    };
  });

  const failures = check(scenario, steps);
  return { ok: failures.length === 0, steps, failures };
};

const EXPECTATIONS = ['wake', 'achieved', 'holds', 'blocks'] as const;

const check = (scenario: Scenario, results: ReadonlyArray<StepResult>): string[] => {
  const failures: string[] = [];
  scenario.steps.forEach((step: Step, index) => {
    const result = results[index];
    for (const key of EXPECTATIONS) {
      const expected = step.expect[key];
      if (expected !== undefined && expected !== null && result[key] !== expected) {
        const labels = key === 'wake' && result.labels.length > 0 ? ` [${result.labels.join(', ')}]` : '';
        failures.push(`${step.id} (${step.note}): ${key}=${result[key]} expected ${expected}${labels}`);
      }
    }
  });
  for (const group of scenario.wakeOneOf ?? []) {
    if (!group.some((id) => results[scenario.steps.findIndex((step) => step.id === id)]?.wake)) {
      failures.push(`no wake in any of ${group.join(', ')} (time-driven wake expected)`);
    }
  }
  return failures;
};

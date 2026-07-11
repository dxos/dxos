//
// Copyright 2026 DXOS.org
//

import { round } from '../results';
import { type SkillMode } from './agent';
import { type Judge, gradeCoverage, gradeFaithfulness, pairwiseWinner } from './judge';

// Scores the brain-vs-rag arms and renders them side-by-side. Each model's arms are graded against
// the same gold set + corpus (see judge.ts); the report puts the metrics in one matrix (modes as
// columns) and the raw summaries next to each other, so a reader can see at a glance whether the
// fact-backed arms beat the database baseline.

/** One graded arm (skill mode) for a single generator model. */
export type ArmScore = {
  readonly mode: SkillMode;
  readonly response: string;
  /** Fraction of gold points covered (0..1). */
  readonly coverage: number;
  readonly covered: number;
  readonly gold: number;
  /** Fraction of the summary's claims the source supports (0..1). */
  readonly faithfulness: number;
  readonly supported: number;
  readonly claims: number;
};

/** A blind pairwise vote of one arm against the baseline arm. */
export type PairwiseScore = {
  readonly candidate: SkillMode;
  readonly winner: 'baseline' | 'candidate' | 'tie';
};

export type VariantScore = {
  readonly model: string;
  readonly baseline: SkillMode;
  readonly arms: readonly ArmScore[];
  readonly pairwise: readonly PairwiseScore[];
};

/**
 * Grades every arm of one generator model: coverage + faithfulness per arm, then a blind pairwise
 * vote of each non-baseline arm against the baseline. Grading is sequential to keep one judge model
 * from being hammered by concurrent requests.
 */
export const scoreVariant = async (options: {
  readonly model: string;
  readonly subject: string;
  readonly corpus: string;
  readonly goldPoints: readonly string[];
  readonly arms: readonly { readonly mode: SkillMode; readonly response: string }[];
  readonly judge: Judge;
  readonly baseline?: SkillMode;
}): Promise<VariantScore> => {
  const { model, subject, corpus, goldPoints, arms, judge } = options;
  const baseline = options.baseline ?? 'database';

  const scored: ArmScore[] = [];
  for (const arm of arms) {
    const coverage = await gradeCoverage(goldPoints, arm.response, judge);
    const faith = await gradeFaithfulness(corpus, arm.response, judge);
    scored.push({
      mode: arm.mode,
      response: arm.response,
      coverage: coverage.total ? round(coverage.covered / coverage.total) : 0,
      covered: coverage.covered,
      gold: coverage.total,
      faithfulness: faith.claims ? round(faith.supported / faith.claims) : 0,
      supported: faith.supported,
      claims: faith.claims,
    });
  }

  const baselineArm = arms.find((arm) => arm.mode === baseline);
  const pairwise: PairwiseScore[] = [];
  if (baselineArm) {
    for (const arm of arms) {
      if (arm.mode === baseline) {
        continue;
      }
      const winner = await pairwiseWinner(subject, goldPoints, baselineArm.response, arm.response, judge);
      pairwise.push({ candidate: arm.mode, winner });
    }
  }

  return { model, baseline, arms: scored, pairwise };
};

const pct = (value: number): string => `${Math.round(value * 100)}%`;

/** Column order: keep the baseline first, then the remaining modes as encountered. */
const orderedModes = (scores: readonly VariantScore[], baseline: SkillMode): SkillMode[] => {
  const seen = new Set<SkillMode>();
  const modes: SkillMode[] = [];
  for (const score of scores) {
    for (const arm of score.arms) {
      if (!seen.has(arm.mode)) {
        seen.add(arm.mode);
        modes.push(arm.mode);
      }
    }
  }
  return [baseline, ...modes.filter((mode) => mode !== baseline)];
};

/** The metric matrix — one coverage row and one faithfulness row per model, modes as columns. */
const scoreMatrix = (scores: readonly VariantScore[], modes: readonly SkillMode[]): string => {
  const header = `| model | metric | ${modes.join(' | ')} |`;
  const rule = `| --- | --- | ${modes.map(() => '---').join(' | ')} |`;
  const cell = (score: VariantScore, mode: SkillMode, pick: (arm: ArmScore) => string): string => {
    const arm = score.arms.find((candidate) => candidate.mode === mode);
    return arm ? pick(arm) : '—';
  };
  const rows = scores.flatMap((score) => [
    `| ${score.model} | coverage | ${modes
      .map((mode) => cell(score, mode, (arm) => `${pct(arm.coverage)} (${arm.covered}/${arm.gold})`))
      .join(' | ')} |`,
    `| | faithfulness | ${modes
      .map((mode) => cell(score, mode, (arm) => `${pct(arm.faithfulness)} (${arm.supported}/${arm.claims})`))
      .join(' | ')} |`,
  ]);
  return [header, rule, ...rows].join('\n');
};

/** The pairwise-vs-baseline table plus an aggregate win-rate row across models. */
const pairwiseMatrix = (scores: readonly VariantScore[], baseline: SkillMode): string => {
  const candidates = [...new Set(scores.flatMap((score) => score.pairwise.map((pair) => pair.candidate)))];
  if (candidates.length === 0) {
    return '';
  }
  const label = (winner: PairwiseScore['winner'], candidate: SkillMode): string =>
    winner === 'candidate' ? `**${candidate}**` : winner === 'baseline' ? baseline : 'tie';
  const header = `| model | ${candidates.map((candidate) => `${candidate} vs ${baseline}`).join(' | ')} |`;
  const rule = `| --- | ${candidates.map(() => '---').join(' | ')} |`;
  const rows = scores.map((score) => {
    const cells = candidates.map((candidate) => {
      const pair = score.pairwise.find((entry) => entry.candidate === candidate);
      return pair ? label(pair.winner, candidate) : '—';
    });
    return `| ${score.model} | ${cells.join(' | ')} |`;
  });
  const winRate = candidates.map((candidate) => {
    const pairs = scores.map((score) => score.pairwise.find((entry) => entry.candidate === candidate)).filter(Boolean);
    const wins = pairs.filter((pair) => pair!.winner === 'candidate').length;
    return pairs.length ? `${wins}/${pairs.length}` : '—';
  });
  return [header, rule, ...rows, `| **win-rate** | ${winRate.join(' | ')} |`].join('\n');
};

/**
 * Renders the full side-by-side comparison as `writeResponses` sections: a scores section (matrix +
 * pairwise + gold set), then one section per model with each arm's summary and its scores adjacent.
 */
export const renderComparison = (options: {
  readonly subject: string;
  readonly prompt: string;
  readonly judge: string;
  readonly goldPoints: readonly string[];
  readonly scores: readonly VariantScore[];
  readonly baseline: SkillMode;
}): { title: string; body: string }[] => {
  const { subject, prompt, judge, goldPoints, scores, baseline } = options;
  const modes = orderedModes(scores, baseline);

  const goldList = goldPoints.length
    ? goldPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')
    : '_(no gold points — judge unavailable or empty corpus)_';
  const pairwise = pairwiseMatrix(scores, baseline);

  const scoreSection = {
    title: `Scores — subject "${subject}", judge ${judge}`,
    body: [
      `Prompt: \`${prompt}\``,
      '',
      '### Coverage & faithfulness (higher is better)',
      '',
      scoreMatrix(scores, modes),
      ...(pairwise ? ['', `### Blind pairwise vs \`${baseline}\` (bold = fact arm won)`, '', pairwise] : []),
      '',
      '### Gold salient points',
      '',
      goldList,
    ].join('\n'),
  };

  const modelSections = scores.map((score) => ({
    title: `${score.model} — arms side-by-side`,
    body: modes
      .map((mode) => {
        const arm = score.arms.find((candidate) => candidate.mode === mode);
        if (!arm) {
          return `### ${mode}\n\n_(not run)_`;
        }
        const stat = `coverage ${pct(arm.coverage)} (${arm.covered}/${arm.gold}) · faithfulness ${pct(
          arm.faithfulness,
        )} (${arm.supported}/${arm.claims})`;
        return `### ${mode} — ${stat}\n\n${arm.response.trim() || '_(empty response)_'}`;
      })
      .join('\n\n'),
  }));

  return [scoreSection, ...modelSections];
};

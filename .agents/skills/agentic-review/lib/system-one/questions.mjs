//
// Copyright 2026 DXOS.org
//

// Turn a review rule into System One questions. Each rule asks up to three things of one state,
// answered independently in the same call: whether the code violates it, where, and which one
// missing piece of context would most change that verdict. The model reads literally, so the
// rule's own prose travels with every question and the criteria spell out both sides.

import { CONTEXT_KINDS } from '../mdl.mjs';

/** Kinds that make sense beside each unit; the context question offers only these. */
const KINDS_FOR_UNIT = {
  file: Object.keys(CONTEXT_KINDS),
  pr: ['diff', 'package', 'public-api', 'pr'],
};

/**
 * Rule prose without its trailing provenance (`Source: …`, which may wrap onto a URL line): it
 * names reviews and links the model cannot use.
 */
export const ruleText = (rule) => {
  const lines = rule.instructions.split('\n');
  const source = lines.findIndex((line) => /^Source:/.test(line.trim()));
  return (source === -1 ? lines : lines.slice(0, source)).join('\n').trim();
};

const ruleField = (rule) => ({ id: rule.id, title: rule.title, text: ruleText(rule) });

/** What the verdict is about, named by state field so the model does not have to infer it. */
const subjectFor = (unit) =>
  unit === 'pr'
    ? 'the change set in `changes`'
    : 'the code in `file.source` (other fields of the state are background, not code under review)';

/**
 * The verdict question: probability that the unit under review violates the rule.
 *
 * @param {object} rule A rule from `loadRules`.
 */
export const verdictQuestion = (rule) => ({
  type: 'noul',
  instructions: {
    question: rule.question ?? `Does ${subjectFor(rule.unit)} violate the rule?`,
    rule: ruleField(rule),
  },
  criteria: {
    true: 'It contains at least one instance of what the rule says to flag.',
    false:
      'It contains nothing the rule says to flag: every look-alike is a case the rule says not to flag, or the rule does not apply to it.',
  },
});

/**
 * The location question: which option holds the clearest violation. Options are segments of a
 * file or, for a `pr` rule, the changed files; asked speculatively beside the verdict and read
 * only when the verdict is positive.
 *
 * @param {object} rule
 * @param {Record<string, string>} options Option id → description.
 */
export const locationQuestion = (rule, options) => ({
  type: 'choice',
  instructions: {
    question:
      rule.unit === 'pr'
        ? 'Which changed file contains the clearest instance of what the rule says to flag?'
        : 'Which segment of `file.source` contains the clearest instance of what the rule says to flag?',
    rule: ruleField(rule),
  },
  criteria: options,
});

/**
 * The context question: which one missing kind would most change the verdict, or `none`. This is
 * how a model that cannot explore asks for more; the checker fetches what it picks.
 *
 * @param {object} rule
 * @param {string[]} present Kinds already in the state.
 * @returns {object|null} Null when every kind the unit allows is already present.
 */
export const contextQuestion = (rule, present) => {
  const missing = KINDS_FOR_UNIT[rule.unit].filter((kind) => !present.includes(kind));
  if (missing.length === 0) {
    return null;
  }
  return {
    type: 'choice',
    instructions: {
      question:
        'Which one additional piece of context, not shown in the state, would most change the answer to whether the code violates the rule?',
      rule: ruleField(rule),
    },
    criteria: {
      none: 'Nothing more is needed: the state already shows enough to judge the rule.',
      ...Object.fromEntries(missing.map((kind) => [kind, CONTEXT_KINDS[kind]])),
    },
  };
};

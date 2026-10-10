//
// Copyright 2026 DXOS.org
//

import { type LatencyStep, type RequestLatency } from '../types.ts';
import { type MarkReading, type RealmMark } from './marks.ts';

/** Mark names shared with the app: `chat.submit` in the chat UI, the other two in `@dxos/ai`'s `AiTelemetry`. */
export const LATENCY_MARKS = {
  submit: 'chat.submit',
  request: 'ai.request',
  response: 'ai.response',
} as const;

/** The detail `@dxos/ai` puts on a call that offers a toolkit, i.e. an agent turn. */
const AGENT_DETAIL = 'tools';

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const round = (ms: number): number => Math.round(ms * 10) / 10;

type Window = { trigger: RealmMark; kind: 'submit' | 'turn'; steps: RealmMark[] };

const stepsOf = ({ trigger, steps }: Window): LatencyStep[] =>
  steps.map(({ name, kind, at }) => ({ name, kind, ms: round(at - trigger.at) }));

/**
 * Turns a stage's merged marks into prompt-to-model latencies.
 *
 * Walks the marks in time order with one open window: a submit opens it, and so does an agent
 * response unless a submit is still waiting for its request; the next agent request closes it. Side
 * calls without a toolkit (chat naming) are steps, not turns, once any call offered tools.
 */
export const requestLatency = ({ marks, realms }: MarkReading): RequestLatency | undefined => {
  const requests = marks.filter(({ name }) => name === LATENCY_MARKS.request);
  if (requests.length === 0) {
    return undefined;
  }
  const agentOnly = requests.some(({ detail }) => detail === AGENT_DETAIL);
  const isAgent = (mark: RealmMark) => !agentOnly || mark.detail === AGENT_DETAIL;

  const closed: Window[] = [];
  let open: Window | undefined;
  for (const mark of marks) {
    if (mark.name === LATENCY_MARKS.submit) {
      open = { trigger: mark, kind: 'submit', steps: [] };
    } else if (mark.name === LATENCY_MARKS.response && isAgent(mark) && open?.kind !== 'submit') {
      open = { trigger: mark, kind: 'turn', steps: [] };
    } else if (mark.name === LATENCY_MARKS.request && isAgent(mark)) {
      if (open) {
        open.steps.push(mark);
        closed.push(open);
      }
      open = undefined;
    } else {
      open?.steps.push(mark);
    }
  }

  const submits = closed.filter(({ kind }) => kind === 'submit');
  const turns = closed.filter(({ kind }) => kind === 'turn');
  const totalOf = ({ trigger, steps }: Window) => round(steps[steps.length - 1].at - trigger.at);

  // First occurrence per name in each turn, so a mark repeated within one turn is not double counted.
  const offsets = new Map<string, { kind: RealmMark['kind']; ms: number[] }>();
  for (const turn of turns) {
    const seen = new Set<string>();
    for (const step of stepsOf(turn)) {
      if (!seen.has(step.name)) {
        seen.add(step.name);
        const entry = offsets.get(step.name) ?? { kind: step.kind, ms: [] };
        entry.ms.push(step.ms);
        offsets.set(step.name, entry);
      }
    }
  }
  const turnPath = [...offsets]
    .filter(([, { ms }]) => ms.length * 2 >= turns.length)
    .map(([name, { kind, ms }]) => ({ name, kind, ms: round(median(ms)) }))
    .sort((left, right) => left.ms - right.ms);

  return {
    submitToRequestMs: submits.map(totalOf),
    turnToRequestMs: turns.map(totalOf),
    submitPath: submits.length > 0 ? stepsOf(submits[0]) : [],
    turnPath,
    realms,
  };
};

/** The median and worst of a latency list, or zeroes when it is empty (the count column says which). */
export const latencySummary = (values: readonly number[]): { p50: number; max: number; count: number } =>
  values.length === 0
    ? { p50: 0, max: 0, count: 0 }
    : { p50: round(median(values)), max: Math.max(...values), count: values.length };

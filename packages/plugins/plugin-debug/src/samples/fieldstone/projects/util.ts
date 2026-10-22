//
// Copyright 2026 DXOS.org
//

import type * as Agent from '@dxos/assistant/Agent';
import { type Obj, Ref } from '@dxos/echo';
import { type Actor } from '@dxos/types';

const MINUTE = 60_000;

const HOUR = 60 * MINUTE;

export const DAY = 24 * HOUR;

/** Epoch ms `days` before the reference date's UTC midnight, at `hour:minute`. */
export const at = (now: number, days: number, hour: number, minute = 0): number =>
  now - (now % DAY) - days * DAY + hour * HOUR + minute * MINUTE;

export const minutes = (count: number): number => count * MINUTE;

export const iso = (ms: number): string => new Date(ms).toISOString();

/** An agent as an actor; `subject` names the session it acts through, once one exists. */
export const agentActor = (agent: Agent.Agent, subject?: Obj.Unknown): Actor.Actor => ({
  role: 'assistant',
  name: agent.name,
  identityDid: agent.did,
  ...(subject && { subject: Ref.make(subject) }),
});

/** Seeded PRNG (mulberry32), so generated transcripts are identical on every build. */
export const prng = (seed: string): (() => number) => {
  let state = 2166136261;
  for (const char of seed) {
    state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export type Random = ReturnType<typeof prng>;

export const between = (random: Random, min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1));

export const pick = <T>(random: Random, values: ReadonlyArray<T>): T => values[Math.floor(random() * values.length)];

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** A ULID-shaped process id. */
export const processId = (random: Random): string =>
  Array.from({ length: 26 }, () => CROCKFORD[Math.floor(random() * 32)]).join('');

/** A provider-shaped tool call id. */
export const toolCallId = (random: Random): string =>
  `toolu_${Array.from({ length: 22 }, () => BASE62[Math.floor(random() * 62)]).join('')}`;

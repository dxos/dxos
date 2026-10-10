//
// Copyright 2026 DXOS.org
//

import { trim } from '@dxos/util';

/** Hand-written reference compilations of the eight example goals, keyed by scenario number. */
export const REFERENCE: Readonly<Record<number, string>> = {
  1: trim`
    wake(dima_work) :- speaker(F, dima), not force(F, expressive).
    wake(dima_work) :- fact(F, dima, _, _), not speaker(F, dima).
  `,
  2: trim`
    shipped(F) :- about(F, "release"), about(F, "shipped"), polarity(F, "+"), not mood(F, interrogative), factuality(F, "CT+").
    candidate(F) :- fact(F, _, _, _), about(F, "release").
    wake(release) :- candidate(F), not achieved(goal).
    achieved(goal) :- shipped(F), fact(N, goal, notified, _), saidAt(F, T1), saidAt(N, T2), T2 >= T1.
  `,
  3: trim`
    dima(F) :- speaker(F, dima), force(F, commissive), about(F, "agent plugin").
    wake(reply) :- dima(F), not achieved(goal).
    wake(reply) :- dima(F), achieved(goal).
    wake(followup) :- elapsed(goal, 2d), not achieved(goal).
    achieved(goal) :- dima(F), polarity(F, "+").
  `,
  4: trim`
    gone(M) :- fact(_, M, archived, inbox).
    gone(M) :- fact(_, M, deleted, inbox).
    waiting(M) :- fact(_, M, received, inbox), not gone(M).
    wake(email) :- fact(F, M, received, inbox).
    holds(goal) :- not waiting(_).
  `,
  5: trim`
    filed(F) :- about(F, "tax return"), about(F, "filed"), polarity(F, "+"), not speaker(F, alice).
    achieved(goal) :- filed(F).
    wake(remind) :- due("2027-04-15T00:00:00Z", 30d), not achieved(goal).
    wake(remind) :- due("2027-04-15T00:00:00Z", 7d), not achieved(goal).
    wake(overdue) :- due("2027-04-15T23:59:59Z", 0d), not achieved(goal).
    wake(progress) :- subgoal(goal, G), status(G, achieved).
    wake(progress) :- speaker(F, rich), about(F, "tax").
  `,
  6: trim`
    wake(practice) :- every(1d), not achieved(goal).
  `,
  7: trim`
    meeting(A) :- action(A, book_meeting).
    meeting(A) :- action(A, update_meeting).
    blocks(A) :- meeting(A), actionArg(A, start, T), weekday(T, friday).
  `,
  8: trim`
    mine(F) :- source(F, "session:s42"), speaker(F, rich).
    wake(turn) :- mine(F), not achieved(goal).
    achieved(goal) :- mine(F), force(F, commissive), polarity(F, "+"), fact(D, goal, drafted, _).
  `,
};

/** Plausible but wrong compilations; replaying the scenario must reject each one. */
export const WRONG: ReadonlyArray<{ readonly scenario: number; readonly note: string; readonly source: string }> = [
  {
    scenario: 3,
    note: 'achievement ignores polarity, so a refusal achieves the goal',
    source: trim`
      achieved(goal) :- speaker(F, dima), force(F, commissive), about(F, "agent plugin").
      wake(followup) :- elapsed(goal, 2d).
      wake(reply) :- speaker(F, dima).
    `,
  },
  {
    scenario: 1,
    note: "only Dima's own messages wake, missing third-party reports",
    source: 'wake(x) :- speaker(F, dima).',
  },
  {
    scenario: 7,
    note: 'any action with any Friday argument is blocked',
    source: 'blocks(A) :- action(A, _), actionArg(A, _, T), weekday(T, friday).',
  },
  {
    scenario: 4,
    note: 'holds on any archived email instead of on an empty inbox',
    source: trim`
      holds(goal) :- fact(_, M, archived, inbox).
      wake(e) :- fact(F, _, received, inbox).
    `,
  },
  {
    scenario: 6,
    note: 'elapsed fires once, not daily',
    source: 'wake(p) :- elapsed(goal, 1d).',
  },
];

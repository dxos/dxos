//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { Plan } from './index';

// The planning hook fires the plan-reminder operation only while the plan has open tasks; cover the
// predicate directly so the branch is verified without an agent turn.
describe('hasIncompleteTasks', () => {
  test('is true while any task is todo or in-progress', ({ expect }) => {
    expect(Plan.hasIncompleteTasks(makePlan(['todo']))).toBe(true);
    expect(Plan.hasIncompleteTasks(makePlan(['done', 'in-progress']))).toBe(true);
  });

  test('is false when every task is done', ({ expect }) => {
    expect(Plan.hasIncompleteTasks(makePlan(['done', 'done']))).toBe(false);
    expect(Plan.hasIncompleteTasks(makePlan([]))).toBe(false);
  });
});

const makePlan = (statuses: readonly Plan.TaskStatus[]): Plan.Plan =>
  Plan.makePlan({ tasks: statuses.map((status, index) => ({ title: `Task ${index}`, status })) });

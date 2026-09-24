//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Ref } from '@dxos/echo';

import * as TestCase from './TestCase.ts';
import * as TestRun from './TestRun.ts';

describe('rollup', () => {
  test('rolls up to the worst outcome', () => {
    // T-1: blocked outranks passed, because nothing was tested for that case.
    expect(
      TestRun.rollup(captured('QA-1', 'QA-2', 'QA-3'), [
        result('QA-1', 'passed'),
        result('QA-2', 'blocked'),
        result('QA-3', 'passed'),
      ]),
    ).to.equal('blocked');
  });

  test('a failure dominates a block', () => {
    // T-2.
    expect(TestRun.rollup(captured('QA-1', 'QA-2'), [result('QA-1', 'failed'), result('QA-2', 'blocked')])).to.equal(
      'failed',
    );
  });

  test('a run covering nothing seals as skipped', () => {
    // T-3: an empty capture is decided before the precedence chain, which would otherwise reach `passed`.
    expect(TestRun.rollup([], [])).to.equal('skipped');
  });

  test('an unreported case cannot seal as passed', () => {
    // T-4: two of three cases never reported.
    expect(TestRun.rollup(captured('QA-1', 'QA-2', 'QA-3'), [result('QA-1', 'passed')])).to.equal('skipped');
  });

  test('every captured case passing is the only route to passed', () => {
    expect(TestRun.rollup(captured('QA-1', 'QA-2'), [result('QA-1', 'passed'), result('QA-2', 'passed')])).to.equal(
      'passed',
    );
  });

  test('a result for a case the run did not capture does not count', () => {
    // The capture is authoritative: a stray result cannot manufacture coverage.
    expect(TestRun.rollup(captured('QA-1'), [result('QA-2', 'passed')])).to.equal('skipped');
  });
});

describe('unreported', () => {
  test('names the captured cases that never reported', () => {
    expect(
      TestRun.unreported({ cases: captured('QA-1', 'QA-2', 'QA-3'), results: [result('QA-2', 'failed')] }),
    ).to.deep.equal(['QA-1', 'QA-3']);
  });
});

describe('tally', () => {
  test('counts passes against the captured total, not the reported one', () => {
    expect(
      TestRun.tally({ cases: captured('QA-1', 'QA-2', 'QA-3'), results: [result('QA-1', 'passed')] }),
    ).to.deep.equal({ passed: 1, total: 3 });
  });
});

/** The rollup reads only the key off a captured case, so the tests supply that much. */
const captured = (...keys: string[]) => keys.map((key) => ({ key }));

const result = (caseKey: string, status: TestCase.ResultStatus): TestRun.Result => ({
  case: Ref.make(TestCase.make({ key: caseKey, title: caseKey, steps: [] })),
  caseKey,
  status,
});

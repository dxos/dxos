//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import { describe, test } from 'vitest';

import * as Policy from './Policy.ts';

const input = {
  args: { to: 'rich@dxos.org', attachments: [{ size: 1 }, { size: 5 }], count: 2 },
  caller: { role: 'editor' },
};

describe('Policy', () => {
  test('every operator', ({ expect }) => {
    expect(Policy.holds(Policy.eq('.caller.role', 'editor'), input)).toBe(true);
    expect(Policy.holds(Policy.neq('.caller.role', 'editor'), input)).toBe(false);
    expect(Policy.holds(Policy.lt('.args.count', 3), input)).toBe(true);
    expect(Policy.holds(Policy.lte('.args.count', 2), input)).toBe(true);
    expect(Policy.holds(Policy.gt('.args.count', 2), input)).toBe(false);
    expect(Policy.holds(Policy.gte('.args.count', 2), input)).toBe(true);
    expect(Policy.holds(Policy.within('.caller.role', ['admin', 'owner']), input)).toBe(false);
    expect(Policy.holds(Policy.like('.args.to', '*@dxos.org'), input)).toBe(true);
    expect(Policy.holds(Policy.like('.args.to', '*@example.com'), input)).toBe(false);
    expect(Policy.holds(Policy.all('.args.attachments', Policy.lte('.size', 5)), input)).toBe(true);
    expect(Policy.holds(Policy.any('.args.attachments', Policy.gt('.size', 4)), input)).toBe(true);
    expect(Policy.holds(Policy.not(Policy.eq('.caller.role', 'reader')), input)).toBe(true);
    expect(
      Policy.holds(Policy.or([Policy.eq('.caller.role', 'reader'), Policy.eq('.caller.role', 'editor')]), input),
    ).toBe(true);
    expect(
      Policy.holds(Policy.and([Policy.eq('.caller.role', 'reader'), Policy.eq('.caller.role', 'editor')]), input),
    ).toBe(false);
  });

  test('a missing path never throws and compares as undefined', ({ expect }) => {
    expect(Policy.holds(Policy.eq('.args.missing.deeper', 1), input)).toBe(false);
    expect(Policy.holds(Policy.lt('.args.missing', 1), input)).toBe(false);
  });

  test('evaluate reports the first failing predicate', ({ expect }) => {
    const policy = [Policy.like('.args.to', '*@dxos.org'), Policy.lte('.args.count', 1)];
    const result = Policy.evaluate(policy, input);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toEqual({ predicate: ['<=', '.args.count', 1], path: '.args.count', actual: 2 });
    }
    expect(Result.isSuccess(Policy.evaluate([policy[0]], input))).toBe(true);
  });

  test('describe renders a sentence for the consent prompt', ({ expect }) => {
    expect(Policy.describe([Policy.like('.args.to', '*@dxos.org'), Policy.lte('.args.attachments.length', 3)])).toBe(
      '.args.to matches *@dxos.org and .args.attachments.length is at most 3',
    );
    expect(Policy.describe([])).toBe('no conditions');
  });

  test('schema accepts predicate arrays and rejects malformed ones', ({ expect }) => {
    expect(
      Policy.isPolicy([
        ['==', '.caller.role', 'editor'],
        ['in', '.caller.role', ['a']],
      ]),
    ).toBe(true);
    expect(Policy.isPolicy([['==', 'caller.role', 'editor']])).toBe(false);
    expect(Policy.isPolicy([['between', '.x', 1]])).toBe(false);
    expect(Policy.isPolicy('not a policy')).toBe(false);
  });

  test('conjoin dedupes and callerOnly keeps the predicates judged without args', ({ expect }) => {
    const shared = Policy.eq('.caller.role', 'editor');
    const conjoined = Policy.conjoin([[shared, Policy.like('.args.to', '*')], [shared]]);
    expect(conjoined).toHaveLength(2);
    expect(Policy.callerOnly(conjoined)).toEqual([shared]);
  });
});

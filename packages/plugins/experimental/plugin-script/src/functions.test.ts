//
// Copyright 2025 DXOS.org
//

import { differenceInDays, format, subDays } from 'date-fns';
import { describe, it } from 'vitest';

import { S } from '@dxos/echo-schema';

// TODO(burdon): Create vitest harness for functions.
describe('functions', () => {
  it('should have defaults', ({ expect }) => {
    const Test = S.Struct({
      name: S.optional(S.String).pipe(S.withDecodingDefault(() => 'Anonymous')),
      created: S.optional(S.Union(S.Number, S.String)).pipe(
        S.withDecodingDefault(() => format(subDays(new Date(), 30), 'yyyy-MM-dd')),
      ),
      email: S.optional(S.String),
    });

    const result = S.decodeSync(Test)({});
    expect(result).contains({ name: 'Anonymous' });
    expect(differenceInDays(new Date(), new Date(result.created))).toBeGreaterThanOrEqual(30);
    expect(result.email).toBeUndefined();
  });
});

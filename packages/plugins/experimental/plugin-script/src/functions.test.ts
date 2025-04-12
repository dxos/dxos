//
// Copyright 2025 DXOS.org
//

import { format, subDays } from 'date-fns';
import { describe, it } from 'vitest';

import { S } from '@dxos/echo-schema';

// TODO(burdon): Create vitest harness for functions.
describe('gmail', () => {
  it('should have defaults', ({ expect }) => {
    const Test = S.Struct({
      name: S.optional(S.String).pipe(S.withDecodingDefault(() => 'Anonymous')),
      created: S.optional(S.Union(S.Number, S.String)).pipe(
        S.withDecodingDefault(() => format(subDays(new Date(), 30), 'yyyy-MM-dd')),
      ),
      email: S.optional(S.String),
    });

    expect(S.decodeSync(Test)({})).contains({ name: 'Anonymous' });
  });
});

//
// Copyright 2025 DXOS.org
//

// import { differenceInDays, format, subDays } from 'date-fns';
import { describe, it } from 'vitest';

import { EchoObject, ObjectId, S } from '@dxos/echo-schema';
import { create } from '@dxos/live-object';

// TODO(burdon): Import types into functions.
// import Contact from ‘dxn:type:dxos.org/Contact’;

const Test = S.Struct({
  name: S.optional(S.String).pipe(S.withDefaults({ constructor: () => 'Anonymous', decoding: () => 'Anonymous' })),
  // created: S.optional(S.Union(S.Number, S.String)).pipe(
  //   S.withDecodingDefault(() => format(subDays(new Date(), 30), 'yyyy-MM-dd')),
  // ),
  email: S.optional(S.String),
}).pipe(EchoObject('dxn:type:dxos.org/Test', '0.1.0'));

// Error if using S.withDefaults
// Error: EchoObject can only be applied to an S.Struct type.

type Test = S.Schema.Type<typeof Test>;

// TODO(burdon): Create vitest harness for functions.
describe('functions', () => {
  it('should have defaults', ({ expect }) => {
    const result = S.decodeSync(Test)({ id: ObjectId.random() });
    expect(result.name).toBe('Anonymous');
    // expect(differenceInDays(new Date(), new Date(result.created))).toBeGreaterThanOrEqual(30);
    expect(result.email).toBeUndefined();
  });

  it('should be constructable with defaults', ({ expect }) => {
    const result = create(Test, {}); // TODO(burdon): Fix.
    expect(result.name).toBe('Anonymous');
    expect(result.email).toBeUndefined();
  });
});

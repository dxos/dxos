//
// Copyright 2025 DXOS.org
//

import * as Data from 'effect/Data';
import { test } from 'vitest';

class MyError extends Data.TaggedError('MyError')<{
  message: string;
}> {
  constructor() {
    super({ message: 'My error message' });
  }
}

// Experimenting with error formatting:
// - If the error doesn't have the message set, vitest will print the error as a JS object.
// - If the error has non-empty message, vitest will pretty-print the error.
test.skip('Data error formatting', () => {
  console.log(JSON.stringify(new MyError(), null, 2));
  throw new MyError();
});

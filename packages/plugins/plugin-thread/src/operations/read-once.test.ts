//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { readOnce } from './read-once';

describe('readOnce', () => {
  test('takes the first emission and unsubscribes', async ({ expect }) => {
    let unsubscribed = false;
    const items = await Effect.runPromise(
      readOnce<string>((onItems) => {
        onItems(['a', 'b']);
        return () => {
          unsubscribed = true;
        };
      }),
    );
    expect(items).to.deep.eq(['a', 'b']);
    expect(unsubscribed).to.be.true;
  });

  test('later emissions are ignored', async ({ expect }) => {
    let emit: ((items: readonly string[]) => void) | undefined;
    const items = await Effect.runPromise(
      readOnce<string>((onItems) => {
        emit = onItems;
        onItems(['first']);
        return () => {};
      }),
    );
    emit?.(['second']);
    expect(items).to.deep.eq(['first']);
  });

  // A backend without the subscription must resolve empty rather than wait for an emission that
  // never comes — otherwise every operation reading through it hangs.
  test('an absent subscription yields an empty list', async ({ expect }) => {
    expect(await Effect.runPromise(readOnce<string>(undefined))).to.deep.eq([]);
  });
});

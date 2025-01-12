import { Effect } from 'effect';
import { describe, expect, test } from 'vitest';
import { makeValueBag, unwrapValueBag } from './schema';
import { testServices } from './testing/test-services';

describe('ValueBag', () => {
  test('unwrapValueBag', async ({ expect }) => {
    const bag = makeValueBag({ a: 1, b: 2 });
    const result = await Effect.runPromise(unwrapValueBag(bag).pipe(Effect.provide(testServices()), Effect.scoped));
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

import { HttpClient } from '@effect/platform';
import { Effect } from 'effect';

export const tapHttpErrors = HttpClient.tap(
  Effect.fn(function* (res) {
    if (res.status > 299) {
      console.log(`Response failed with code ${res.status}:\n`, yield* res.text);
    }
  }),
);

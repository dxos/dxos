//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import { Database } from '@dxos/echo';

import { SpecReviews } from '#sync';

import { CodeOperationError } from '../errors.ts';

/** Records a `.review.mdl` text as a review of `spec`, replacing the review with the same front matter. */
export const recordReview = Effect.fn(function* (spec: Spec.Spec, content: string) {
  const fields = SpecReviews.fromText(content);
  if (typeof fields === 'string') {
    return yield* Effect.fail(new CodeOperationError({ message: fields }));
  }
  const reviews = yield* Database.query(SpecReview.query(spec)).run.pipe(Effect.orDie);
  const { review, created } = SpecReviews.applyReview(spec, reviews, fields);
  return { review: created ? yield* Database.add(review) : review, created };
});

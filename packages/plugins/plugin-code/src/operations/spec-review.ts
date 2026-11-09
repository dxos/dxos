//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import { parseReview, parseSourceKey } from '@dxos/deus/review';
import { Database, Obj } from '@dxos/echo';

import { SpecReviews } from '#sync';

import { CodeOperationError } from '../errors.ts';

/** The meta key source plugin-github's file sync keys repositories and the objects it imports with. */
export const GITHUB_SOURCE = 'github.com';

/**
 * Records a `.review.mdl` text as a review of `spec`, replacing the review with the same front matter. Refused when
 * the review names another file than the one file sync binds `spec` to.
 */
export const recordReview = Effect.fn(function* (spec: Spec.Spec, content: string) {
  const fields = SpecReviews.fromText(content);
  if (typeof fields === 'string') {
    return yield* Effect.fail(new CodeOperationError({ message: fields }));
  }
  // File sync keys a spec `<repo id>:<path>`.
  const boundPath = Obj.getMeta(spec)
    .keys.find(({ source }) => source === GITHUB_SOURCE)
    ?.id.replace(/^[^:]*:/, '');
  const named = parseReview(content).spec;
  const namedPath = named ? parseSourceKey(named)?.path : undefined;
  if (boundPath !== undefined && namedPath !== undefined && namedPath !== boundPath) {
    return yield* Effect.fail(
      new CodeOperationError({ message: `The review is of ${namedPath}, not of this spec's ${boundPath}.` }),
    );
  }
  const reviews = yield* Database.query(SpecReview.query(spec)).run.pipe(Effect.orDie);
  const { review, created } = SpecReviews.applyReview(spec, reviews, fields);
  return { review: created ? yield* Database.add(review) : review, created };
});

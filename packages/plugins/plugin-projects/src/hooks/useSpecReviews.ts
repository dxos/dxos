//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo, useRef } from 'react';

import type * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import { type ReviewModel } from '@dxos/deus/review';
import { Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { type ReviewData, currentReviewModel } from '../components/SpecModel/index.ts';

export type SpecReviews = {
  /** The spec's reviews, newest first. */
  reviews: readonly ReviewData[];
  /** Each item's newest verdict across the reviews. */
  review?: ReviewModel;
};

/** The reviews of `spec`, through each review's atom so one recorded again with new verdicts reaches the views. */
export const useSpecReviews = (spec?: Spec.Spec): SpecReviews => {
  const queried = useQuery(spec && Obj.getDatabase(spec), SpecReview.query(spec));
  const queriedRef = useRef(queried);
  queriedRef.current = queried;
  // Keyed on the reviews the query holds: it emits a new array on edits that touch no review, which would rebuild every
  // editor built on the model.
  const ids = queried.map((review) => review.id).join();
  const reviews = useAtomValue(
    useMemo(
      () => Atom.make((get) => queriedRef.current.map((review) => get(Obj.atom(review))).sort(SpecReview.byNewest)),
      [ids],
    ),
  );
  const review = useMemo(() => currentReviewModel(reviews), [reviews]);
  return { reviews, review };
};

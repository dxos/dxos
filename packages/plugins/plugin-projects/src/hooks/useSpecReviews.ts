//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

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
  const reviews = useAtomValue(
    useMemo(
      () => Atom.make((get) => queried.map((review) => get(Obj.atom(review))).sort(SpecReview.byNewest)),
      [queried],
    ),
  );
  const review = useMemo(() => currentReviewModel(reviews), [reviews]);
  return { reviews, review };
};

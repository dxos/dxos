//
// Copyright 2026 DXOS.org
//

import type * as SpecReview from '@dxos/compute/SpecReview';
import { type ReviewModel, mergeReviews } from '@dxos/deus/review';

/** What the editor and panel read of a review: a live object or its snapshot. */
export type ReviewData = Pick<SpecReview.SpecReview, 'id' | 'commit' | 'date' | 'by' | 'summary' | 'verdicts'>;

/** A review as the review model the editor and panel read. */
export const toReviewModel = (review: Omit<ReviewData, 'id'>): ReviewModel => ({
  commit: review.commit,
  date: review.date,
  by: review.by,
  ...(review.summary && { summary: review.summary }),
  verdicts: Object.entries(review.verdicts).map(([id, verdict]) => ({
    id,
    ...verdict,
    evidence: [...verdict.evidence],
    tests: [...verdict.tests],
    walkthrough: [...verdict.walkthrough],
  })),
});

/** Each item's newest verdict across a spec's reviews; undefined when it has none. */
export const currentReviewModel = (reviews: readonly Omit<ReviewData, 'id'>[]): ReviewModel | undefined =>
  mergeReviews(reviews.map(toReviewModel));

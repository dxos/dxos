//
// Copyright 2026 DXOS.org
//

import type * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import { type ReviewModel, mergeReviews, parseReview } from '@dxos/deus/review';
import { Obj } from '@dxos/echo';

/** A review file's fields as a SpecReview's, without the spec. */
export type ReviewFields = Omit<SpecReview.MakeProps, 'spec'>;

/** What the editor and panel read of a review: a live object or its snapshot. */
export type ReviewData = Pick<SpecReview.SpecReview, 'id' | 'commit' | 'date' | 'by' | 'summary' | 'verdicts'>;

/** The review a `.review.mdl` text holds; a string naming what is missing when its front matter is incomplete. */
export const fromText = (text: string): ReviewFields | string => {
  const { commit, date, by, summary, verdicts } = parseReview(text);
  if (!commit || !date || !by) {
    return 'A review needs `commit`, `date` and `by` in its front matter.';
  }
  return {
    commit,
    date,
    by,
    ...(summary && { summary }),
    verdicts: Object.fromEntries(verdicts.map(({ id, review: _, ...verdict }) => [id, verdict])),
  };
};

/** A review as the review model the editor and panel read. */
export const toModel = (review: Omit<ReviewData, 'id'>): ReviewModel => ({
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
export const currentModel = (reviews: readonly Omit<ReviewData, 'id'>[]): ReviewModel | undefined =>
  mergeReviews(reviews.map(toModel));

/**
 * Records a review of `spec`: one with the same commit, date and reviewer as an existing review replaces its summary
 * and verdicts; any other is a new review, returned unadded so the caller adds it to its database.
 */
export const applyReview = (
  spec: Spec.Spec,
  reviews: readonly SpecReview.SpecReview[],
  fields: ReviewFields,
): { review: SpecReview.SpecReview; created: boolean } => {
  const existing = reviews.find((review) => SpecReview.sameReview(review, fields));
  if (!existing) {
    return { review: SpecReview.make({ spec, ...fields }), created: true };
  }
  // Importers offer the same file again on every pass, which must not write a change each time.
  const same =
    JSON.stringify([existing.summary, existing.verdicts]) === JSON.stringify([fields.summary, fields.verdicts]);
  if (same) {
    return { review: existing, created: false };
  }
  Obj.update(existing, (existing) => {
    existing.summary = fields.summary;
    existing.verdicts = Object.fromEntries(
      Object.entries(fields.verdicts).map(([id, verdict]) => [
        id,
        {
          ...verdict,
          evidence: [...verdict.evidence],
          tests: [...verdict.tests],
          walkthrough: verdict.walkthrough.map((step) => ({ ...step })),
        },
      ]),
    );
  });
  return { review: existing, created: false };
};

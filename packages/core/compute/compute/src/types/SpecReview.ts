//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, DXN, Filter, Obj, Query, Ref, Type } from '@dxos/echo';

import * as Spec from './Spec.ts';

/**
 * How far the code meets one spec item, least severe first: `done` as specified, `untested` present but with no test
 * that covers it, `partial` in part, `diverged` implemented differently from what the spec says, `missing` not at all.
 */
export const VerdictStatus = Schema.Literals(['done', 'untested', 'partial', 'diverged', 'missing']);
export type VerdictStatus = Schema.Schema.Type<typeof VerdictStatus>;

/** One segment of a walkthrough: a sentence and the `github:` key of the code it describes. */
export const WalkthroughStep = Schema.Struct({ text: Schema.String, key: Schema.String });
export interface WalkthroughStep extends Schema.Schema.Type<typeof WalkthroughStep> {}

/** A review's judgement of one spec item. */
export const Verdict = Schema.Struct({
  status: VerdictStatus,
  summary: Schema.optional(Schema.String),
  note: Schema.optional(Schema.String),
  /** `github:` keys of the code that supports the verdict. */
  evidence: Schema.Array(Schema.String),
  /** `github:` keys of the tests that exercise the item. */
  tests: Schema.Array(Schema.String),
  /** Where each part of the item is implemented, in reading order. */
  walkthrough: Schema.Array(WalkthroughStep),
});
export interface Verdict extends Schema.Schema.Type<typeof Verdict> {}

/**
 * One compliance review of a spec: which commit's code was read, when and by whom, and a verdict per spec item. The
 * format is fixed (a `.review.mdl` file's), so a review is created whole and never edited by hand. A spec's history
 * is its reviews; an item's current status is its newest verdict in any of them.
 */
export class SpecReview extends Type.makeObject<SpecReview>(DXN.make('org.dxos.type.projects.specReview', '0.1.0'))(
  Schema.Struct({
    spec: Ref.Ref(Spec.Spec),
    /** The commit the code was read at. */
    commit: Schema.String,
    /** When the review was made: `YYYY-MM-DD`, or `YYYY-MM-DDTHH:MMZ` in UTC to order the reviews of one day. */
    date: Schema.String,
    /** Who made it: `user:<handle>` or `agent:<name>`. */
    by: Schema.String,
    summary: Schema.optional(Schema.String),
    /** Keyed by spec item id: a block (`Scene`, `F-3`) or a nested requirement (`F-3.2`). */
    verdicts: Schema.Record(Schema.String, Verdict),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--seal-check--regular', hue: 'violet' })),
) {}

/** The reviews a spec holds; the refs make the spec each review's owner, so deleting the spec deletes them. */
export const ReviewsAnnotation = Annotation.make({
  id: 'org.dxos.projects.reviews',
  schema: Schema.Array(Ref.Ref(SpecReview)),
});

export type MakeProps = Omit<Obj.MakeProps<typeof SpecReview>, 'spec'> & { spec: Spec.Spec };

/** A review listed on and owned by its spec, so it is deleted with the spec. */
export const make = ({ spec, ...props }: MakeProps): SpecReview => {
  const review = Obj.make(SpecReview, { [Obj.Parent]: spec, ...props, spec: Ref.make(spec) });
  const ref = Ref.make(review);
  if (Option.isNone(Annotation.get(spec, ReviewsAnnotation))) {
    Obj.update(spec, (spec) => {
      Annotation.set(spec, ReviewsAnnotation, [ref]);
    });
  } else {
    // Appended in place, so two peers recording reviews each keep theirs.
    Annotation.update(spec, ReviewsAnnotation, (reviews) => {
      reviews.push(ref);
    });
  }
  return review;
};

export const instanceOf = (value: unknown): value is SpecReview => Obj.instanceOf(SpecReview, value);

/** The reviews of a spec; none without one. */
export const query = (spec: Spec.Spec | undefined) =>
  Query.select(spec ? Filter.id(spec.id) : Filter.nothing()).referencedBy(SpecReview, 'spec');

/** Whether two reviews are the same one: the same commit, date and reviewer. */
export const sameReview = (
  a: Pick<SpecReview, 'commit' | 'date' | 'by'>,
  b: Pick<SpecReview, 'commit' | 'date' | 'by'>,
) => a.commit === b.commit && a.date === b.date && a.by === b.by;

/** Newest first, by review date; a date with a time orders after that day's plain date. */
export const byNewest = (a: Pick<SpecReview, 'date'>, b: Pick<SpecReview, 'date'>): number =>
  b.date.localeCompare(a.date);

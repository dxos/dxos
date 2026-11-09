//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import * as SpecReview from '@dxos/compute/SpecReview';
import { type Verdict } from '@dxos/deus/review';
import { Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { SpecReviews } from '#sync';
import { type Feature, FeatureMap } from '#types';

/** Each of a feature's requirements' newest verdict across the reviews of the spec it is on, by requirement id. */
export const useRequirementVerdicts = (feature: Feature.Feature): Readonly<Record<string, Verdict>> => {
  const spec = FeatureMap.getContainer(feature);
  const reviews = useQuery(spec && Obj.getDatabase(spec), SpecReview.query(spec));
  // Through each review's atom, so a review recorded again with new verdicts reaches the rows.
  return useAtomValue(
    useMemo(
      () =>
        Atom.make((get) => {
          const current = SpecReviews.currentModel(reviews.map((review) => get(Obj.atom(review))));
          // Null-prototype, so a requirement id such as `constructor` reads no inherited value.
          return Object.assign(
            Object.create(null) as Record<string, Verdict>,
            Object.fromEntries((current?.verdicts ?? []).map((verdict) => [verdict.id, verdict])),
          );
        }),
      [reviews],
    ),
  );
};

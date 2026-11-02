//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Relation, Type } from '@dxos/echo';
import * as ProjectOperation from '@dxos/plugin-projects/ProjectOperation';
import { type AnchoredTo } from '@dxos/types';

import { Feature } from '#types';

import * as FeatureAnchor from '../util/feature-anchor.ts';

const typename = Type.getTypename(Feature.Feature);

/** Comments anchored into a feature's name, description and requirements, read and ordered by the anchor module. */
export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(AppCapabilities.CommentConfig, {
      id: typename,
      comments: 'anchored',
      scrollToAnchor: ProjectOperation.ScrollToAnchor,
    }),
    Capability.contribute(AppCapabilities.AnchorSort, {
      key: typename,
      sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => {
        const feature = Relation.getTarget(anchorA);
        return Feature.instanceOf(feature) && feature === Relation.getTarget(anchorB)
          ? FeatureAnchor.compare(feature, anchorA.anchor, anchorB.anchor)
          : 0;
      },
    }),
    Capability.contribute(AppCapabilities.AnchorResolver, {
      key: typename,
      getText: (feature: Feature.Feature, anchor: string) => FeatureAnchor.getText(feature, anchor),
    }),
  ]),
);

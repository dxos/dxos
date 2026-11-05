//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Annotation, Obj, Relation, Type } from '@dxos/echo';
import * as ProjectOperation from '@dxos/plugin-projects/ProjectOperation';
import { type AnchoredTo } from '@dxos/types';

import { Feature, FeatureMap } from '#types';

import { CodeNamespace } from '../namespace.ts';
import * as FeatureAnchor from '../util/feature-anchor.ts';

const typename = Type.getTypename(Feature.Feature);

/** The features on a spec's map, read through `get` so the list follows edits. */
const getMapFeatures = (spec: Spec.Spec, get: Atom.AtomContext): Feature.Feature[] => {
  const refs = Option.getOrElse(get(Annotation.atom(spec, FeatureMap.FeaturesAnnotation)), () => []);
  return get(Obj.atomReactive(refs)).filter(Feature.instanceOf);
};

const withFeatures = (spec: Spec.Spec | undefined, get: Atom.AtomContext): Obj.Unknown[] =>
  spec ? [spec, ...getMapFeatures(spec, get)] : [];

/**
 * Comments anchored into a feature's name, description and requirements; and, for a project, a spec or a feature's
 * level, the threads on the features on each map it shows. Deeper levels keep their own.
 */
export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(AppCapabilities.CommentConfig, {
      id: typename,
      comments: 'anchored',
      scrollToAnchor: ProjectOperation.ScrollToAnchor,
      // Anchors are field paths the field editors write, never a selection on a map or list.
      anchorFromSelection: () => undefined,
    }),
    Capability.contribute(AppCapabilities.AnchorSort, {
      key: typename,
      sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => {
        const feature = Relation.getTarget(anchorA);
        return Feature.instanceOf(feature) && feature.id === Relation.getTarget(anchorB).id
          ? FeatureAnchor.compare(feature, anchorA.anchor, anchorB.anchor)
          : 0;
      },
    }),
    Capability.contribute(AppCapabilities.AnchorResolver, {
      key: typename,
      getText: (feature: Feature.Feature, anchor: string) => FeatureAnchor.getText(feature, anchor),
    }),
    Capability.contribute(AppCapabilities.CommentScope, {
      id: `${CodeNamespace.key}.feature-map`,
      resolve: (data, get) => {
        if (Obj.instanceOf(Project.Project, data)) {
          const specs = get(Obj.atomReactive(get(Obj.atom(data)).specs)).filter(Spec.instanceOf);
          return { subject: data, targets: [data, ...specs.flatMap((spec) => withFeatures(spec, get))] };
        }
        if (Spec.instanceOf(data)) {
          return { subject: data, targets: withFeatures(data, get) };
        }
        if (Feature.instanceOf(data)) {
          const breakdown = get(Obj.atom(data)).spec;
          const spec = breakdown && get(Obj.atomReactive(breakdown));
          return { subject: data, targets: [data, ...withFeatures(Spec.instanceOf(spec) ? spec : undefined, get)] };
        }
        return undefined;
      },
    }),
  ]),
);

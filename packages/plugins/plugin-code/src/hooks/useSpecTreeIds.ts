//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import * as Spec from '@dxos/compute/Spec';
import { Annotation, Obj } from '@dxos/echo';

import { Feature, FeatureMap } from '#types';

/**
 * Ids of every feature on the spec and on the specs nested beneath it, read through atoms so a feature added at any
 * level, or a breakdown made for one, is counted. Stops at a spec already visited, so a cycle cannot loop.
 */
export const useSpecTreeIds = (spec: Spec.Spec | undefined): readonly string[] => {
  const idsAtom = useMemo(
    () =>
      Atom.make((get) => {
        const ids: string[] = [];
        const seen = new Set<string>();
        const visit = (level: Spec.Spec) => {
          if (seen.has(level.id)) {
            return;
          }
          seen.add(level.id);
          const features = Option.getOrElse(get(Annotation.atom(level, FeatureMap.FeaturesAnnotation)), () => []);
          for (const member of get(Obj.atomReactive(features)).filter(Feature.instanceOf)) {
            ids.push(member.id);
            const { spec: breakdown } = get(Obj.atom(member));
            const nested = breakdown && get(Obj.atomReactive(breakdown));
            if (Spec.instanceOf(nested)) {
              visit(nested);
            }
          }
        };
        if (spec) {
          visit(spec);
        }
        return ids.join(',');
      }),
    [spec],
  );
  // Joined, so an unchanged set keeps its identity across renders and the graph's subscriptions stay put.
  const key = useAtomValue(idsAtom);
  return useMemo(() => (key ? key.split(',') : []), [key]);
};

//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import type * as Project from '@dxos/compute/Project';
import { Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';

import { Feature, Spec } from '#types';

/** The spec the project owns, live: it follows `Project.spec` as it is set, changed or cleared. */
export const useProjectSpec = (project: Project.Project): Spec.Spec | undefined => {
  const [specRef] = useObject(project, 'spec');
  const spec = useResolveRef(specRef);
  return Spec.instanceOf(spec) ? spec : undefined;
};

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
          for (const member of get(Obj.atomReactive(get(Obj.atom(level)).features)).filter(Feature.instanceOf)) {
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

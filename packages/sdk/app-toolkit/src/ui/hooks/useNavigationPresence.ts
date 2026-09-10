//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import { EID } from '@dxos/keys';

import { AppCapabilities } from '../../app-framework';
import * as GraphPath from '../../app/GraphPath';
import * as NotFound from '../../app/NotFound';

const toTarget = (graph: AppGraph.ExpandableGraph, id: string): { spaceId: string; entityId?: string } | undefined => {
  const segments = id.split(GraphNode.PathSeparator);
  if (segments[0] !== GraphNode.RootId || !segments[1]) {
    return undefined;
  }
  if (segments.length === 2) {
    return { spaceId: segments[1] };
  }
  return Option.match(GraphPath.tryGetEid(graph, id), {
    onNone: () => undefined,
    onSome: (eid) => {
      const spaceId = EID.getSpaceId(eid);
      const entityId = EID.getEntityId(eid);
      return spaceId && entityId ? { spaceId, entityId } : undefined;
    },
  });
};

/**
 * Whether the thing `id` addresses is there: the graph node's presence when it has one, otherwise
 * what the {@link AppCapabilities.NavigationTargetLoader}s could determine. Callers render `unknown`
 * as loading and `absent` as not found.
 */
export const useNavigationPresence = (
  graph: AppGraph.ExpandableGraph,
  id: string | undefined,
): AppCapabilities.NavigationTargetVerdict => {
  const loaders = useCapabilities(AppCapabilities.NavigationTargetLoader);
  const present = !!id && Option.isSome(AppGraph.getNode(graph, id));
  const [verdict, setVerdict] = useState<AppCapabilities.NavigationTargetVerdict>('unknown');

  useEffect(() => {
    if (!id || present) {
      setVerdict('unknown');
      return;
    }
    const target = toTarget(graph, id);
    if (!target || loaders.length === 0) {
      setVerdict('unknown');
      return;
    }

    let current = true;
    setVerdict('unknown');
    void EffectEx.runPromise(
      Effect.forEach(loaders, (loader) =>
        loader
          .load(target)
          .pipe(Effect.catch(() => Effect.succeed<AppCapabilities.NavigationTargetVerdict>('unknown'))),
      ),
    ).then((verdicts) => {
      if (current) {
        setVerdict(NotFound.combineVerdicts(verdicts));
      }
    });
    return () => {
      current = false;
    };
  }, [graph, id, present, loaders]);

  return present ? 'exists' : verdict;
};

//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import { useEffect, useMemo } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type ActionGraphProps, graphActions, isPromptAction } from '@dxos/react-ui-menu';

export type PromptActions = {
  /** The prompt node; also the key its controls share, such as the dictation session. */
  nodeId?: string;
  actions?: Atom.Atom<ActionGraphProps>;
};

/**
 * The actions other plugins filed on the prompt node under `hostId` (see {@link AppNode.makePrompt}).
 * Expands the path to the prompt node and its actions, since nothing else expands a hidden node.
 */
export const usePromptActions = (hostId: string | undefined): PromptActions => {
  const { graph } = ToolkitHooks.useAppGraph();
  const nodeId = hostId && AppNode.getPromptId(hostId);

  useEffect(() => {
    if (!graph || !nodeId) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      AppGraph.expandPath(graph, nodeId);
      AppGraph.expandSync(graph, nodeId, 'action');
    });
    return () => cancelAnimationFrame(frame);
  }, [graph, nodeId]);

  const actions = useMemo(
    () => (nodeId ? Atom.make((get) => graphActions(graph, get, nodeId, { filter: isPromptAction })) : undefined),
    [graph, nodeId],
  );

  return { nodeId, actions };
};

//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect, useMemo } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';

import { SpaceNamespace } from '../../namespace.ts';
import { getPeerNodeId, getSessionNodeId } from '../../util/index.ts';

export type PeerActionsProps = {
  spaceId: string;
  identityKey: string;
  /** Acts on this session of the peer rather than their most recently moved one. */
  sessionId?: string;
};

/** The actions contributed on a peer's (or one of their session's) graph node, as buttons. */
export const PeerActions = ({ spaceId, identityKey, sessionId }: PeerActionsProps) => {
  const { t } = UiHooks.useTranslation(SpaceNamespace.key);
  const { graph } = ToolkitHooks.useAppGraph();
  const runAction = GraphHooks.useActionRunner();
  const nodeId = sessionId ? getSessionNodeId(spaceId, identityKey, sessionId) : getPeerNodeId(spaceId, identityKey);

  // A peer's node is hidden, so nothing else expands it or its actions.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      AppGraph.expandPath(graph, nodeId);
      AppGraph.expandSync(graph, nodeId, 'action');
    });
    return () => cancelAnimationFrame(frame);
  }, [graph, nodeId]);

  const actions = useAtomValue(useMemo(() => graph.actions(nodeId), [graph, nodeId]));

  return (
    <>
      {actions.filter(AppGraphNode.isAction).map((action) => (
        <Button.Root
          key={action.id}
          variant='outline'
          icon={action.properties.icon}
          label={Theme.toLocalizedString(action.properties.label, t)}
          data-testid={action.properties.testId}
          onClick={() => void runAction(action)}
        />
      ))}
    </>
  );
};

//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect } from 'react';

import { useCapability } from '@dxos/app-framework/Hooks';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as Node from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { useTranslation } from '@dxos/react-ui/Theme';

import { useContributions } from '../hooks.ts';
import { Empty, type PanelProps } from './common.tsx';

/** Deep enough to reach a space's sections and their objects. */
const MAX_DEPTH = 5;

/** The app graph from its root, expanded as far as a plugin's sections and their objects. */
export const AppGraphPanel = ({ pluginId, empty }: PanelProps) => {
  const builders = useContributions(pluginId, AppCapabilities.AppGraphBuilder);
  const { graph } = useCapability(AppCapabilities.AppGraph);

  if (builders.length === 0) {
    return <Empty>{empty}</Empty>;
  }

  return (
    <ul className='text-sm'>
      <GraphNode graph={graph} id={AppGraph.getRoot(graph).id} depth={0} />
    </ul>
  );
};

type GraphNodeProps = { graph: AppGraph.ExpandableGraph; id: string; depth: number };

const GraphNode = ({ graph, id, depth }: GraphNodeProps) => {
  const node = useAtomValue(graph.node(id));
  const children = useAtomValue(graph.connections(id, 'child'));
  const actions = useAtomValue(graph.actions(id));
  useEffect(() => {
    if (depth < MAX_DEPTH) {
      AppGraph.expandSync(graph, id, 'child');
    }
  }, [graph, id, depth]);

  if (node._tag === 'None') {
    return null;
  }

  return (
    <li className='ps-3'>
      <NodeLabel node={node.value} />
      {actions.length > 0 && (
        <span className='text-description'>
          {' · '}
          {actions.map((action, index) => (
            <span key={action.id}>
              {index > 0 && ', '}
              <Label node={action} />
            </span>
          ))}
        </span>
      )}
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <GraphNode key={child.id} graph={graph} id={child.id} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

const NodeLabel = ({ node }: { node: Node.Node }) => (
  <span>
    <Label node={node} /> <span className='text-description font-mono'>{node.type}</span>
  </span>
);

/** A node's `label` property, translated; its id when it has none. */
const Label = ({ node }: { node: Pick<Node.Node, 'id' | 'properties'> }) => {
  const { t } = useTranslation();
  const label: unknown = node.properties.label;
  const text =
    typeof label === 'string'
      ? label
      : Array.isArray(label) && typeof label[0] === 'string'
        ? t(label[0], label[1])
        : undefined;
  return <>{text ?? node.id}</>;
};

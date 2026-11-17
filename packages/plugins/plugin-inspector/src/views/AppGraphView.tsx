//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as Node from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui/Theme';

import { useContributions } from '../hooks.ts';
import { Note, Section, type ViewProps } from './common.tsx';

/** Deep enough to reach a space's sections and their objects. */
const MAX_DEPTH = 5;

type Label = Pick<Node.Node, 'id' | 'properties'>;

type TreeNode = {
  node: Node.Node;
  /** Whether the inspected plugin added the node: one of its types, or labelled from its strings. */
  ours: boolean;
  actions: readonly Label[];
  children: readonly TreeNode[];
};

/** The namespace a node's label is translated from, if any. */
const labelNamespace = (node: Label): string | undefined => {
  const label: unknown = node.properties.label;
  if (Array.isArray(label) && typeof label[1] === 'object' && label[1] !== null && 'ns' in label[1]) {
    return typeof label[1].ns === 'string' ? label[1].ns : undefined;
  }
  return undefined;
};

/**
 * The graph from its root, pruned to the branches that lead to something the plugin added. Reads each node's
 * connections through `get`, so the tree updates as the graph does.
 */
const tree = (
  get: Atom.AtomContext,
  graph: AppGraph.ExpandableGraph,
  isOurs: (node: Label & { type?: string }) => boolean,
  id: string,
  depth: number,
): TreeNode | undefined => {
  const option = get(graph.node(id));
  if (option._tag === 'None') {
    return undefined;
  }
  if (depth < MAX_DEPTH) {
    AppGraph.expandSync(graph, id, 'child');
  }
  const children =
    depth < MAX_DEPTH
      ? get(graph.connections(id, 'child')).flatMap(
          (child: Node.Node) => tree(get, graph, isOurs, child.id, depth + 1) ?? [],
        )
      : [];
  const actions = get(graph.actions(id)).filter(isOurs);
  const ours = isOurs(option.value);
  return ours || actions.length > 0 || children.length > 0
    ? { node: option.value, ours, actions, children }
    : undefined;
};

/** App Graph, showing where the plugin's nodes and actions land. */
export const AppGraphView = ({ moduleId, pluginKey, pluginModuleIds }: ViewProps) => {
  const builders = useContributions([moduleId], AppCapabilities.AppGraphBuilder);
  const typenames = useContributions(pluginModuleIds, AppCapabilities.Schema)
    .flat()
    .map((type) => Type.getTypename(type));
  const { graph } = Hooks.useCapability(AppCapabilities.AppGraph);
  const key = typenames.join(',');
  const atom = useMemo(() => {
    const isOurs = (node: Label & { type?: string }) =>
      labelNamespace(node) === pluginKey || (node.type !== undefined && typenames.includes(node.type));
    return Atom.make((get) => tree(get, graph, isOurs, AppGraph.getRoot(graph).id, 0));
    // `key` stands in for `typenames`, which is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, pluginKey, key]);
  const root = useAtomValue(atom);

  if (builders.length === 0) {
    return <Note>This module contributes nothing to App Graph.</Note>;
  }

  return (
    <Section title='Where the plugin lands in App Graph'>
      {root && root.children.length > 0 ? (
        <ul className='text-sm'>
          {root.children.map((child) => (
            <GraphNode key={child.node.id} tree={child} />
          ))}
        </ul>
      ) : (
        <Note>Nothing yet. A builder often adds nodes only once there is an object, so create a sample object.</Note>
      )}
    </Section>
  );
};

const GraphNode = ({ tree }: { tree: TreeNode }) => (
  <li className='ps-3 py-0.5'>
    <span className={tree.ours ? 'text-accent-text font-medium' : ''}>
      <NodeLabel node={tree.node} />
    </span>
    {tree.actions.length > 0 && (
      <span className='text-accent-text'>
        {' · '}
        {tree.actions.map((action, index) => (
          <span key={action.id}>
            {index > 0 && ', '}
            <NodeLabel node={action} />
          </span>
        ))}
      </span>
    )}
    {tree.children.length > 0 && (
      <ul>
        {tree.children.map((child) => (
          <GraphNode key={child.node.id} tree={child} />
        ))}
      </ul>
    )}
  </li>
);

/** A node's `label` property, translated; its id when it has none. */
const NodeLabel = ({ node }: { node: Label }) => {
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

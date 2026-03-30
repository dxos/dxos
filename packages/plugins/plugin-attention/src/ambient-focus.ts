//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { Graph } from '@dxos/app-graph';
import { Obj } from '@dxos/echo';
import { type AttentionHistoryEntry, type AttentionManager } from '@dxos/react-ui-attention';

/**
 * Resolved ECHO object info from a graph node.
 */
export type ResolvedEchoNode = {
  /** The DXN of the ECHO object. */
  dxn: string;
  /** The typename of the ECHO object. */
  typename: string;
  /** The label of the graph node. */
  label: string;
  /** The graph node ID. */
  nodeId: string;
  /** The path from root to this node in the graph. */
  path: string[];
};

/**
 * Options for resolving attention IDs to ECHO nodes.
 */
export type ResolveAttentionOptions = {
  /** The attention manager to get current and history from. */
  attention: AttentionManager;
  /** The app graph to resolve nodes from. */
  graph: Graph.ReadableGraph;
};

/**
 * Resolves a list of attention IDs to ECHO-backed graph nodes.
 * Filters out non-ECHO nodes and deduplicates by DXN.
 */
export const resolveAttentionToEchoNodes = (
  attentionIds: readonly string[],
  graph: Graph.ReadableGraph,
): ResolvedEchoNode[] => {
  const seen = new Set<string>();
  const resolved: ResolvedEchoNode[] = [];

  for (const nodeId of attentionIds) {
    const nodeOpt = Graph.getNode(graph, nodeId);
    if (Option.isNone(nodeOpt)) {
      continue;
    }

    const node = nodeOpt.value;
    const persistenceClass = node.properties.persistenceClass;

    if (persistenceClass !== 'echo') {
      continue;
    }

    const data = node.data;
    if (!Obj.isObject(data)) {
      continue;
    }

    const dxn = Obj.getDXN(data)?.toString();
    if (!dxn || seen.has(dxn)) {
      continue;
    }

    seen.add(dxn);

    const pathOpt = Graph.getPath(graph, { target: nodeId });
    const path: string[] = Option.isSome(pathOpt) ? [...pathOpt.value] : [nodeId];

    resolved.push({
      dxn,
      typename: node.type,
      label: String(node.properties.label ?? ''),
      nodeId,
      path,
    });
  }

  return resolved;
};

/**
 * Maximum token budget for ambient focus context (approximate).
 */
const MAX_TOKEN_BUDGET = 500;

/**
 * Estimates token count for a string (rough approximation: ~4 chars per token).
 */
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/**
 * Formats a resolved ECHO node for display in the ephemeral context.
 */
const formatNode = (node: ResolvedEchoNode): string => {
  return `[${node.dxn} ${node.typename} "${node.label}" path:${node.path.join('/')}]`;
};

/**
 * Creates the ambient focus context string from attention state.
 * Returns undefined if there's nothing to inject.
 *
 * Format: `<ephemeral_context>Currently viewing: [...]. Recently viewed: [...].</ephemeral_context>`
 */
export const createAmbientFocusContext = ({ attention, graph }: ResolveAttentionOptions): string | undefined => {
  const currentIds = attention.getCurrent();
  const history = attention.getHistory();

  if (currentIds.length === 0 && history.length === 0) {
    return undefined;
  }

  const currentNodes = resolveAttentionToEchoNodes(currentIds, graph);
  const historyNodes = resolveAttentionToEchoNodes(
    history.map((entry: AttentionHistoryEntry) => entry.id),
    graph,
  );

  if (currentNodes.length === 0 && historyNodes.length === 0) {
    return undefined;
  }

  const currentDxns = new Set(currentNodes.map((node) => node.dxn));
  const recentNodes = historyNodes.filter((node) => !currentDxns.has(node.dxn));

  const parts: string[] = [];
  let tokenCount = 0;

  if (currentNodes.length > 0) {
    const currentFormatted = currentNodes.map(formatNode);
    const currentText = `Currently viewing: ${currentFormatted.join(', ')}.`;
    tokenCount += estimateTokens(currentText);
    parts.push(currentText);
  }

  if (recentNodes.length > 0 && tokenCount < MAX_TOKEN_BUDGET) {
    const recentFormatted: string[] = [];
    for (const node of recentNodes) {
      const formatted = formatNode(node);
      const additionalTokens = estimateTokens(formatted + ', ');
      if (tokenCount + additionalTokens > MAX_TOKEN_BUDGET) {
        break;
      }
      recentFormatted.push(formatted);
      tokenCount += additionalTokens;
    }

    if (recentFormatted.length > 0) {
      parts.push(`Recently viewed: ${recentFormatted.join(', ')}.`);
    }
  }

  if (parts.length === 0) {
    return undefined;
  }

  return `<ephemeral_context>${parts.join(' ')}</ephemeral_context>`;
};

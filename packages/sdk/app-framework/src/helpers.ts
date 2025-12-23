//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import type * as Layer from 'effect/Layer';

import { Capabilities } from './common';
import { type PluginContext } from './core';

type DependencyNode = {
  id: string;
  dependsOn?: string[];
};

/**
 * Topologically sorts a list of nodes based on their dependencies.
 */
// TODO(wittjosiah): Factor out?
export const topologicalSort = <T extends DependencyNode>(nodes: T[]): T[] => {
  const getDependencies = (nodeId: string, seen = new Set<string>(), path = new Set<string>()): string[] => {
    if (path.has(nodeId)) {
      throw new Error(`Circular dependency detected involving ${nodeId}`);
    }
    if (seen.has(nodeId)) {
      return [];
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found but is listed as a dependency`);
    }

    const newPath = new Set([...path, nodeId]);
    const newSeen = new Set([...seen, nodeId]);

    const dependsOn = node.dependsOn ?? [];
    return [...dependsOn.flatMap((depId) => getDependencies(depId, newSeen, newPath)), nodeId];
  };

  // Get all unique dependencies.
  const allDependencies = nodes
    .map((node) => node.id)
    .flatMap((id) => getDependencies(id))
    .filter((id, index, self) => self.indexOf(id) === index);

  // Map back to original nodes
  return allDependencies
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is T => node !== undefined);
};

/**
 * Finds a layer in plugin capabilities that provides the given context tag.
 *
 * @param context The plugin context to search for layers.
 * @param tag The context tag to find a layer for.
 * @returns The layer that provides the tag, or undefined if not found.
 *
 * @example
 * const dbLayer = findLayerByTag(pluginManager.context, Database.Service);
 * if (dbLayer) {
 *   // Use the layer
 *   const runtime = ManagedRuntime.make(dbLayer);
 * }
 */
export const findLayerByTag = <Service>(
  context: PluginContext,
  _tag: Context.Tag<Service, Service>,
): Layer.Layer<Service, any, any> | undefined => {
  const layers = context.getCapabilities(Capabilities.Layer);
  return layers.find((layer): layer is Layer.Layer<Service, any, any> => layer !== undefined);
};

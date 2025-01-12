//
// Copyright 2025 DXOS.org
//

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

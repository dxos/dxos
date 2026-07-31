//
// Copyright 2026 DXOS.org
//

import { Graph, GraphModel } from '@dxos/graph';

import type * as Capability from '../capability';
import type * as Plugin from '../plugin';

//
// Pure ordering logic for the activation scheduler, built on the shared `@dxos/graph` model.
// Everything here is side-effect free and operates on explicit inputs so the scheduler's
// decisions can be read — and tested — independently of manager state.
//
// This module's vocabulary (kept out of the rest of the manager):
//
// - A ROUND is one graph: nodes carry the modules being considered for activation, edges point
//   provider -> consumer and carry the capability identifier that induced them.
// - Edge KIND distinguishes ordering strength:
//   - `hard`: an unsatisfied singleton require; the consumer must not run before the provider.
//   - `soft`: a multi require; ordering is best-effort so same-round contributions are visible
//     to consumers that read the collection once at startup (multi requires never block).
// - A WAVE is a batch of modules with no ordering edges among them: waves run one after
//   another, and the modules within a wave run concurrently.
//

export type EdgeKind = 'hard' | 'soft';

export type ActivationNode = Graph.Node.Node<Plugin.PluginModule>;
export type ActivationEdge = Graph.Edge.Edge<{ capability: string }>;
export type ActivationGraphModel = GraphModel.GraphModel<ActivationNode, ActivationEdge>;

export type CycleEntry = { module: string; capability: string };

const makeModel = (modules: readonly Plugin.PluginModule[]): ActivationGraphModel => {
  const model = new GraphModel.GraphModel<ActivationNode, ActivationEdge>();
  modules.forEach((module) => model.addNode({ id: module.id, data: module }));
  return model;
};

/** Parallel edges (same pair, different capability) need distinct ids. */
const edgeId = (kind: EdgeKind, source: string, target: string, capability: string): string =>
  `${kind}|${source}|${capability}|${target}`;

const addEdge = (
  model: ActivationGraphModel,
  kind: EdgeKind,
  source: string,
  target: string,
  capability: string,
): void => {
  model.addEdge({ id: edgeId(kind, source, target, capability), type: kind, source, target, data: { capability } });
};

export type SelectRunnableInputs = {
  candidates: readonly Plugin.PluginModule[];
  /** Module ids excluded up front (e.g. duplicate singleton providers). */
  excluded: ReadonlySet<string>;
  /** Whether a singleton capability already has a contribution. */
  isSatisfied: (capability: Capability.AnyTag) => boolean;
  /** This round's singleton provider for a capability identifier, if any. */
  providerOf: (identifier: string) => string | undefined;
  /** Already-active module ids (an active provider resolves via the bounded waitFor bridge). */
  activeIds: readonly string[];
  /** Whether ANY registered module (active or not, fired or not) provides this capability. */
  anyRegisteredProvider: (identifier: string) => boolean;
};

export type SelectRunnableResult = {
  runnable: Plugin.PluginModule[];
  /** Requires with no possible provider at all — a configuration error for the caller to report. */
  missing: Array<{ module: Plugin.PluginModule; capability: string }>;
  /** Modules left out of this round (including the `missing` ones), with the require that made
   * them wait — a later round reconsiders them once the provider becomes available. */
  waiting: Array<{ module: Plugin.PluginModule; capability: string }>;
};

/**
 * Selects the candidates that can run this round: a module is runnable when every unsatisfied
 * singleton require is provided by another runnable candidate or an already-active module.
 * Everything else waits for a later round (e.g. providers gated on an event that has not fired
 * yet). Multi requires never block. Requires with no possible provider at all are returned in
 * `missing`.
 *
 * Removing one module can strand its dependents, so removals propagate: dropping a provider
 * re-checks exactly the modules that relied on it within the round, until the selection is
 * stable.
 */
export const selectRunnableModules = ({
  candidates,
  excluded,
  isSatisfied,
  providerOf,
  activeIds,
  anyRegisteredProvider,
}: SelectRunnableInputs): SelectRunnableResult => {
  const selected = new Map(
    candidates.filter((module) => !excluded.has(module.id)).map((module) => [module.id, module]),
  );
  const missing: SelectRunnableResult['missing'] = [];
  const waiting: SelectRunnableResult['waiting'] = [];

  // In-round reliance edges: provider id -> the modules (and requires) that count on it. Only
  // these need re-checking when a provider drops out.
  const consumersOf = new Map<string, Array<{ module: Plugin.PluginModule; capability: string }>>();
  const removalQueue: string[] = [];
  const remove = (module: Plugin.PluginModule, capability: string): void => {
    if (!selected.delete(module.id)) {
      return;
    }
    waiting.push({ module, capability });
    removalQueue.push(module.id);
  };

  // First pass: drop modules whose provider is outside the round and not active; record
  // in-round reliance edges for everything else.
  for (const module of [...selected.values()]) {
    for (const capability of module.activation.requires) {
      if (capability.arity === 'multi' || isSatisfied(capability)) {
        continue;
      }
      const provider = providerOf(capability.identifier);
      if (provider !== undefined && selected.has(provider)) {
        const consumers = consumersOf.get(provider) ?? [];
        consumers.push({ module, capability: capability.identifier });
        consumersOf.set(provider, consumers);
        continue;
      }
      if (provider !== undefined && activeIds.includes(provider)) {
        // Active provider whose capability was conditionally skipped: the consumer resolves it
        // via the bounded waitFor bridge.
        continue;
      }
      if (provider === undefined && !anyRegisteredProvider(capability.identifier)) {
        missing.push({ module, capability: capability.identifier });
      }
      // A provider exists but is not in play (event not fired, module in a different chain,
      // plugin disabled): wait until a later round unlocks it.
      remove(module, capability.identifier);
      break;
    }
  }

  // Propagate: a removed provider strands the modules that relied on it, transitively.
  for (let next = removalQueue.shift(); next !== undefined; next = removalQueue.shift()) {
    for (const consumer of consumersOf.get(next) ?? []) {
      remove(consumer.module, consumer.capability);
    }
  }

  return { runnable: [...selected.values()], missing, waiting };
};

/**
 * Builds a round's ordering graph. Hard edges gate a consumer on its unsatisfied singleton
 * providers within the round; soft edges order a consumer after the round's multi providers.
 */
export const buildRoundGraph = (
  modules: readonly Plugin.PluginModule[],
  {
    isSatisfied,
    providerOf,
  }: {
    isSatisfied: (capability: Capability.AnyTag) => boolean;
    providerOf: (identifier: string) => string | undefined;
  },
): ActivationGraphModel => {
  const model = makeModel(modules);
  const multiProviders = new Map<string, string[]>();
  for (const module of modules) {
    for (const capability of module.activation.provides) {
      if (capability.arity === 'multi') {
        const providers = multiProviders.get(capability.identifier) ?? [];
        providers.push(module.id);
        multiProviders.set(capability.identifier, providers);
      }
    }
  }
  for (const module of modules) {
    for (const capability of module.activation.requires) {
      if (capability.arity === 'multi') {
        for (const provider of multiProviders.get(capability.identifier) ?? []) {
          if (provider !== module.id) {
            addEdge(model, 'soft', provider, module.id, capability.identifier);
          }
        }
        continue;
      }
      if (isSatisfied(capability)) {
        continue;
      }
      const provider = providerOf(capability.identifier);
      if (provider !== undefined && model.findNode(provider) !== undefined) {
        addEdge(model, 'hard', provider, module.id, capability.identifier);
      }
    }
  }
  return model;
};

/**
 * Builds the singleton require -> provider graph across the given modules regardless of event
 * gating or satisfaction — used to surface capability cycles that span activation events (two
 * modules on different events requiring each other's provides would otherwise pend forever).
 */
export const buildSingletonGraph = (modules: readonly Plugin.PluginModule[]): ActivationGraphModel => {
  const model = makeModel(modules);
  const providersByCapability = new Map<string, string[]>();
  for (const module of modules) {
    for (const capability of module.activation.provides) {
      if (capability.arity !== 'single') {
        continue;
      }
      const providers = providersByCapability.get(capability.identifier) ?? [];
      providers.push(module.id);
      providersByCapability.set(capability.identifier, providers);
    }
  }
  for (const module of modules) {
    for (const capability of module.activation.requires) {
      if (capability.arity === 'multi') {
        continue;
      }
      for (const provider of providersByCapability.get(capability.identifier) ?? []) {
        if (provider !== module.id) {
          addEdge(model, 'hard', provider, module.id, capability.identifier);
        }
      }
    }
  }
  return model;
};

/** Outgoing adjacency (provider -> consumers) restricted to the given edge kinds. */
const adjacency = (
  model: ActivationGraphModel,
  kinds: readonly EdgeKind[],
): Map<string, Array<{ target: string; capability: string }>> => {
  const out = new Map<string, Array<{ target: string; capability: string }>>();
  for (const edge of model.edges) {
    if (!kinds.includes(edge.type as EdgeKind)) {
      continue;
    }
    const targets = out.get(edge.source) ?? [];
    targets.push({ target: edge.target, capability: edge.data.capability });
    out.set(edge.source, targets);
  }
  return out;
};

/**
 * Kahn's algorithm over the graph restricted to the given edge kinds, returning topological
 * activation waves (modules in the same wave have no edges among them and activate
 * concurrently). Returns `undefined` when the restricted graph is cyclic.
 */
export const computeActivationWaves = (
  model: ActivationGraphModel,
  kinds: readonly EdgeKind[],
): Plugin.PluginModule[][] | undefined => {
  const edges = adjacency(model, kinds);
  const inDegree = new Map(model.nodes.map((node) => [node.id, 0]));
  for (const [, targets] of edges) {
    for (const { target } of targets) {
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
    }
  }

  const waves: Plugin.PluginModule[][] = [];
  let visited = 0;
  let frontier = model.nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0);
  while (frontier.length > 0) {
    waves.push(frontier.map((node) => node.data));
    visited += frontier.length;
    const next: ActivationNode[] = [];
    for (const node of frontier) {
      for (const { target } of edges.get(node.id) ?? []) {
        const remaining = (inDegree.get(target) ?? 0) - 1;
        inDegree.set(target, remaining);
        if (remaining === 0) {
          const targetNode = model.findNode(target);
          if (targetNode) {
            next.push(targetNode);
          }
        }
      }
    }
    frontier = next;
  }
  return visited === model.nodes.length ? waves : undefined;
};

/**
 * Finds one cycle in the graph (restricted to the given edge kinds) for diagnostics: each entry
 * is a module and the capability identifier on its outgoing edge within the cycle.
 */
export const findCyclePath = (model: ActivationGraphModel, kinds: readonly EdgeKind[]): CycleEntry[] => {
  const edges = adjacency(model, kinds);
  const state = new Map<string, 'visiting' | 'done'>();
  let cycle: CycleEntry[] = [];

  const visit = (id: string, stack: CycleEntry[]): boolean => {
    state.set(id, 'visiting');
    for (const { target, capability } of edges.get(id) ?? []) {
      if (state.get(target) === 'done') {
        continue;
      }
      const entry = { module: id, capability };
      if (state.get(target) === 'visiting') {
        const start = stack.findIndex((frame) => frame.module === target);
        cycle = [...stack.slice(start === -1 ? 0 : start), entry];
        return true;
      }
      if (visit(target, [...stack, entry])) {
        return true;
      }
    }
    state.set(id, 'done');
    return false;
  };

  for (const node of model.nodes) {
    if (!state.has(node.id) && visit(node.id, [])) {
      break;
    }
  }
  return cycle;
};

/** Ids of the providers the module must not run before (its incoming hard edges). */
export const requiredProviderIds = (model: ActivationGraphModel, moduleId: string): string[] =>
  model.filterEdges({ target: moduleId, type: 'hard' }).map((edge) => edge.source);

/** Whether the graph carries any soft (multi-capability) ordering edges. */
export const hasSoftEdges = (model: ActivationGraphModel): boolean => model.edges.some((edge) => edge.type === 'soft');

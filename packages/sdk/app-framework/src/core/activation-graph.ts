//
// Copyright 2026 DXOS.org
//

import { Graph, GraphModel } from '@dxos/graph';

import type * as Capability from './capability';
import type * as Plugin from './plugin';

//
// Pure ordering logic for the dependency scheduler (`plugin-manager.ts`), built on the shared
// `@dxos/graph` model. Everything here is side-effect free and operates on explicit inputs so
// the scheduler's decisions can be read — and tested — independently of manager state.
//
// A round is one graph: nodes carry the modules, edges point provider -> consumer and carry the
// capability identifier that induced them. Edge kind distinguishes ordering strength:
// - `hard`: an unsatisfied singleton require; violating it breaks activation.
// - `soft`: a multi require; best-effort ordering so same-round contributions are visible to
//   one-shot snapshot reads (multi never hard-gates).
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

export type FixpointInputs = {
  candidates: readonly Plugin.PluginModule[];
  /** Module ids excluded up front (e.g. duplicate singleton providers). */
  excluded: ReadonlySet<string>;
  /** Whether a singleton capability already has a contribution. */
  isSatisfied: (capability: Capability.AnyTag) => boolean;
  /** Runnable-round singleton provider for a capability identifier, if any. */
  providerOf: (identifier: string) => string | undefined;
  /** Already-active module ids (an active provider resolves via the bounded waitFor bridge). */
  activeIds: readonly string[];
  /** Whether ANY registered module (active or not, latched or not) provides this capability. */
  anyRegisteredProvider: (identifier: string) => boolean;
};

export type FixpointResult = {
  runnable: Plugin.PluginModule[];
  /** Requires with no possible provider at all — a configuration error for the caller to report. */
  missing: Array<{ module: Plugin.PluginModule; capability: string }>;
  /** Every pend decision (including the `missing` ones), for the caller's diagnostics. */
  pended: Array<{ module: Plugin.PluginModule; capability: string }>;
};

/**
 * Satisfiability fixpoint: a candidate is runnable when every unsatisfied singleton require is
 * provided by another runnable candidate (or an active module). Everything else pends for a
 * later cascade round (e.g. providers gated on an event that has not fired yet). Multi
 * requires never gate. Requires with no possible provider at all are returned in `missing`.
 */
export const computeRunnableFixpoint = ({
  candidates,
  excluded,
  isSatisfied,
  providerOf,
  activeIds,
  anyRegisteredProvider,
}: FixpointInputs): FixpointResult => {
  const runnable = new Map(
    candidates.filter((module) => !excluded.has(module.id)).map((module) => [module.id, module]),
  );
  const missing: FixpointResult['missing'] = [];
  const pended: FixpointResult['pended'] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const module of [...runnable.values()]) {
      for (const capability of module.activation.requires) {
        if (capability.arity === 'multi' || isSatisfied(capability)) {
          continue;
        }
        const provider = providerOf(capability.identifier);
        if (provider !== undefined && (runnable.has(provider) || activeIds.includes(provider))) {
          // Ordered within this round, or active (an active provider whose capability
          // was conditionally skipped resolves via the bounded waitFor bridge).
          continue;
        }
        if (provider === undefined && !anyRegisteredProvider(capability.identifier)) {
          missing.push({ module, capability: capability.identifier });
        }
        // A provider exists but is not in play (event not fired, module pending in a
        // different chain, plugin disabled): pend until a cascade round unlocks it.
        pended.push({ module, capability: capability.identifier });
        runnable.delete(module.id);
        changed = true;
        break;
      }
    }
  }
  return { runnable: [...runnable.values()], missing, pended };
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

/** Ids of the module's hard-edge providers within the graph (its incoming hard edges). */
export const hardProviderIds = (model: ActivationGraphModel, moduleId: string): string[] =>
  model.filterEdges({ target: moduleId, type: 'hard' }).map((edge) => edge.source);

/** Whether the graph carries any soft (multi-capability) ordering edges. */
export const hasSoftEdges = (model: ActivationGraphModel): boolean => model.edges.some((edge) => edge.type === 'soft');

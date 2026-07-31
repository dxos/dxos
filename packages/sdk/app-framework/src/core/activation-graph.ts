//
// Copyright 2026 DXOS.org
//

import type * as Capability from './capability';
import type * as Plugin from './plugin';

//
// Pure graph math for the dependency scheduler (`plugin-manager.ts`). Everything here is
// side-effect free and operates on explicit inputs so the scheduler's decisions can be read —
// and tested — independently of manager state. Edges are provider -> consumer maps labelled
// with the capability identifier that induced them.
//

export type EdgeMap = Map<string, Map<string, string>>;

/** Adds a labelled provider -> consumer edge. */
export const addEdge = (edges: EdgeMap, from: string, to: string, capability: string): void => {
  const targets = edges.get(from) ?? new Map<string, string>();
  targets.set(to, capability);
  edges.set(from, targets);
};

/** Indexes multi-capability providers among a round's modules: capability identifier -> module ids. */
export const indexMultiProviders = (modules: readonly Plugin.PluginModule[]): Map<string, string[]> => {
  const providers = new Map<string, string[]>();
  for (const module of modules) {
    for (const capability of module.activation.provides) {
      if (capability.arity === 'multi') {
        const list = providers.get(capability.identifier) ?? [];
        list.push(module.id);
        providers.set(capability.identifier, list);
      }
    }
  }
  return providers;
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

export type RoundEdges = {
  /** Singleton require -> provider edges; violating one breaks activation. */
  hard: EdgeMap;
  /** Multi require -> provider edges; best-effort ordering for one-shot snapshot reads. */
  soft: EdgeMap;
};

/**
 * Builds the round's ordering edges. Hard edges gate a consumer on its unsatisfied singleton
 * providers within the round; soft edges order a consumer after the round's multi providers so
 * same-round contributions are visible to one-shot snapshot reads (multi never hard-gates).
 */
export const buildRoundEdges = (
  modules: readonly Plugin.PluginModule[],
  {
    isSatisfied,
    providerOf,
    runnableIds,
  }: {
    isSatisfied: (capability: Capability.AnyTag) => boolean;
    providerOf: (identifier: string) => string | undefined;
    runnableIds: ReadonlySet<string>;
  },
): RoundEdges => {
  const multiProviders = indexMultiProviders(modules);
  const hard: EdgeMap = new Map();
  const soft: EdgeMap = new Map();
  for (const module of modules) {
    for (const capability of module.activation.requires) {
      if (capability.arity === 'multi') {
        for (const provider of multiProviders.get(capability.identifier) ?? []) {
          if (provider !== module.id) {
            addEdge(soft, provider, module.id, capability.identifier);
          }
        }
        continue;
      }
      if (isSatisfied(capability)) {
        continue;
      }
      const provider = providerOf(capability.identifier);
      if (provider !== undefined && runnableIds.has(provider)) {
        addEdge(hard, provider, module.id, capability.identifier);
      }
    }
  }
  return { hard, soft };
};

/** Merges soft edges over hard edges into a combined ordering graph. */
export const mergeEdges = (hard: EdgeMap, soft: EdgeMap): EdgeMap => {
  const combined: EdgeMap = new Map(hard);
  for (const [from, targets] of soft) {
    const merged = new Map(combined.get(from) ?? []);
    targets.forEach((capability, to) => merged.set(to, capability));
    combined.set(from, merged);
  }
  return combined;
};

/**
 * Kahn's algorithm over the capability graph, returning topological activation waves
 * (modules in the same wave have no edges among them and activate concurrently).
 * Returns `undefined` when the graph is cyclic.
 */
export const computeActivationWaves = (
  modules: readonly Plugin.PluginModule[],
  edges: ReadonlyMap<string, ReadonlyMap<string, string>>,
): Plugin.PluginModule[][] | undefined => {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const inDegree = new Map(modules.map((module) => [module.id, 0]));
  for (const [from, targets] of edges) {
    if (!byId.has(from)) {
      continue;
    }
    for (const to of targets.keys()) {
      if (inDegree.has(to)) {
        inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
      }
    }
  }

  const waves: Plugin.PluginModule[][] = [];
  let visited = 0;
  let frontier = modules.filter((module) => (inDegree.get(module.id) ?? 0) === 0);
  while (frontier.length > 0) {
    waves.push([...frontier]);
    visited += frontier.length;
    const next: Plugin.PluginModule[] = [];
    for (const module of frontier) {
      for (const to of edges.get(module.id)?.keys() ?? []) {
        if (!inDegree.has(to)) {
          continue;
        }
        const remaining = (inDegree.get(to) ?? 0) - 1;
        inDegree.set(to, remaining);
        if (remaining === 0) {
          const target = byId.get(to);
          if (target) {
            next.push(target);
          }
        }
      }
    }
    frontier = next;
  }
  return visited === modules.length ? waves : undefined;
};

/**
 * Finds one cycle in the capability graph for diagnostics: each entry is a module and the
 * capability identifier on its outgoing edge within the cycle.
 */
export const findCyclePath = (
  modules: readonly Plugin.PluginModule[],
  edges: ReadonlyMap<string, ReadonlyMap<string, string>>,
): Array<{ module: string; capability: string }> => {
  const state = new Map<string, 'visiting' | 'done'>();
  let cycle: Array<{ module: string; capability: string }> = [];

  const visit = (id: string, stack: Array<{ module: string; capability: string }>): boolean => {
    state.set(id, 'visiting');
    for (const [to, capability] of edges.get(id) ?? []) {
      if (state.get(to) === 'done') {
        continue;
      }
      const entry = { module: id, capability };
      if (state.get(to) === 'visiting') {
        const start = stack.findIndex((frame) => frame.module === to);
        cycle = [...stack.slice(start === -1 ? 0 : start), entry];
        return true;
      }
      if (visit(to, [...stack, entry])) {
        return true;
      }
    }
    state.set(id, 'done');
    return false;
  };

  for (const module of modules) {
    if (!state.has(module.id) && visit(module.id, [])) {
      break;
    }
  }
  return cycle;
};

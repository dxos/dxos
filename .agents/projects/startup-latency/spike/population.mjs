//
// Builds a faithful synthetic replica of Composer's boot module population from the
// startup-latency Phase 1 map, so the activation scheduler can be measured in isolation.
//
// Fidelity comes from the map: module count, per-plugin grouping, family sizes (which set
// multi-capability fan-in) and every recorded singleton/multi `requires` edge. Bodies are
// deliberately empty — the point is to measure the scheduler, not the code it loads.
//

import { readFileSync } from 'node:fs';

/** Families whose dispatch-relevant content is index- or value-shaped (see the evaluation). */
export const MANIFEST_FAMILIES = new Set([
  'translations',
  'pluginAsset',
  'schema',
  'reactSurface',
  'appGraphBuilder',
  'createObject',
  'skillDefinition',
  'operationHandler',
]);

/** Index-shaped families plus `settings`, whose defaults are data but whose atom is read synchronously. */
export const MANIFEST_FAMILIES_PLUS_SETTINGS = new Set([...MANIFEST_FAMILIES, 'settings']);

const familyCapability = (family) => `org.dxos.bench.capability.${family}`;

// Map the multi `requires` identifiers the map recorded onto the family that provides them, so
// fan-in (e.g. 37 operationHandler providers -> 3 consumers) is reproduced rather than invented.
const MULTI_REQUIRE_TO_FAMILY = {
  'org.dxos.app-framework.capability.operationHandler': 'operationHandler',
  'org.dxos.app-framework.capability.translations': 'translations',
  'org.dxos.app-framework.capability.schema': 'schema',
  'org.dxos.app-framework.capability.skillDefinition': 'skillDefinition',
  'org.dxos.app-framework.capability.pluginAsset': 'pluginAsset',
  'org.dxos.app-framework.capability.layerSpec': 'layerSpec',
  'org.dxos.app-framework.capability.undoMapping': 'undoMapping',
  'org.dxos.app-toolkit.capability.navigationHandler': 'navigationHandler',
  'org.dxos.plugin.connector.capability.connector': 'connector',
};

const parseRequire = (raw) => {
  const [identifier, arity] = raw.split('#');
  return { identifier, arity: arity === 'multi' ? 'multi' : 'single' };
};

// `org.dxos.plugin.client.capability.client` -> `client`; framework/toolkit ids have no plugin.
const pluginOfIdentifier = (identifier) => {
  const match = /^org\.dxos\.plugin\.([^.]+)\./.exec(identifier);
  return match ? match[1] : undefined;
};

/**
 * @param mapPath path to the Phase 1 `map.json`.
 * @param drop set of family names to omit (simulating "this family lives in the manifest").
 * @param scale multiplies the population; 1 reproduces the measured 456.
 * @param wave 'startup' puts every ungated module on the Startup pass (the shape the map
 *   measured); 'default' leaves them on Idle (today's default) — only the pinned families boot.
 */
export const buildSpec = ({ mapPath, drop = new Set(), scale = 1, wave = 'startup' }) => {
  const modules = JSON.parse(readFileSync(mapPath, 'utf8')).modules;

  // Every singleton capability that something requires needs exactly one provider. Prefer a real
  // module of the naming plugin; synthesize one when the map has no candidate (the provider was
  // itself outside the sampled population).
  const singletonIds = new Set();
  const multiIds = new Set();
  for (const module of modules) {
    for (const raw of module.requires ?? []) {
      const { identifier, arity } = parseRequire(raw);
      (arity === 'multi' ? multiIds : singletonIds).add(identifier);
    }
  }

  const byPlugin = new Map();
  for (const module of modules) {
    const list = byPlugin.get(module.plugin) ?? [];
    list.push(module);
    byPlugin.set(module.plugin, list);
  }

  // Every required singleton gets a dedicated provider module with no requires of its own.
  // Attaching them to guessed real modules produced unsatisfiable waits; a dedicated provider
  // keeps every consumer edge real while guaranteeing the graph is satisfiable. The same
  // providers are added to every variant, so they cancel out of the deltas.
  const synthetic = [];
  for (const identifier of singletonIds) {
    synthetic.push({
      id: `org.dxos.bench.provider.module.${identifier.replace(/[^a-zA-Z0-9]/g, '_')}`,
      plugin: 'bench-providers',
      family: '(none)',
      requires: [],
      singletonProvides: [identifier],
    });
  }

  const kept = modules.filter((module) => !drop.has(module.family));
  const population = [...kept, ...synthetic];

  const emit = (module, suffix) => {
    const provides = [];
    for (const identifier of module.singletonProvides ?? []) {
      provides.push({ identifier, arity: 'single' });
    }
    if (module.family && module.family !== '(none)') {
      provides.push({ identifier: familyCapability(module.family), arity: 'multi' });
    }
    const requires = [];
    for (const raw of module.requires ?? []) {
      const { identifier, arity } = parseRequire(raw);
      if (arity === 'multi') {
        const family = MULTI_REQUIRE_TO_FAMILY[identifier];
        requires.push({ identifier: family ? familyCapability(family) : identifier, arity: 'multi' });
      } else {
        requires.push({ identifier, arity: 'single' });
      }
    }
    return {
      id: `${module.id}${suffix}`,
      plugin: `${module.plugin}${suffix}`,
      family: module.family,
      requires,
      provides,
      // Un-gated modules were the startup pass in the measured shape.
      startup: wave === 'startup' ? true : PINNED_FAMILIES.has(module.family),
    };
  };

  const out = [];
  for (let copy = 0; copy < scale; copy++) {
    const suffix = copy === 0 ? '' : `.c${copy}`;
    for (const module of population) {
      // Only the first copy carries the singleton graph; clones would be duplicate providers.
      const emitted = emit(module, suffix);
      if (copy > 0) {
        emitted.provides = emitted.provides.filter((capability) => capability.arity === 'multi');
        emitted.requires = emitted.requires.filter((capability) => capability.arity === 'multi');
      }
      out.push(emitted);
    }
  }
  return out;
};

/** Families whose makers pin `activatesOn: Startup` today (AppCapability.ts). */
const PINNED_FAMILIES = new Set([
  'settings',
  'operationHandler',
  'reactContext',
  'reactRoot',
  'layerSpec',
  'navigationHandler',
  'navigationResolver',
  '(none)',
]);

export { familyCapability };

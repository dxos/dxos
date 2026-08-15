//
// Spike: how much of boot is the activation scheduler itself?
//
// Runs the real PluginManager over a synthetic population replicated from the startup-latency
// Phase 1 map (module count, per-plugin grouping, family sizes -> multi fan-in, and every
// recorded requires edge). Module bodies are EMPTY, so wall time is scheduler work only:
// registration, round selection, graph construction, Kahn waves, contribution expansion,
// capability-registry writes and atom invalidation.
//
// Variants differ only in how many modules the scheduler must schedule. The "manifest" runs omit
// the index- and value-shaped families — exactly what a build-time manifest would take off the
// scheduler — while keeping every singleton provider, so the graph stays satisfiable.
//

import * as Effect from 'effect/Effect';

import { DXN } from '@dxos/keys';

import * as ActivationEvents from '../../../../packages/sdk/app-framework/dist/lib/common/activation-events.mjs';
import * as Capability from '../../../../packages/sdk/app-framework/dist/lib/core/capability.mjs';
import * as PluginManager from '../../../../packages/sdk/app-framework/dist/lib/core/plugin-manager.mjs';
import * as Plugin from '../../../../packages/sdk/app-framework/dist/lib/core/plugin.mjs';
import { MANIFEST_FAMILIES, MANIFEST_FAMILIES_PLUS_SETTINGS, buildSpec } from './population.mjs';

const MAP_PATH = new URL('../map.json', import.meta.url).pathname;
const REPEATS = Number(process.env.REPEATS ?? 5);

/** Tags are interned so every module sees one identity per capability. */
const makeTagCache = () => {
  const cache = new Map();
  return ({ identifier, arity }) => {
    const key = `${identifier}#${arity}`;
    let tag = cache.get(key);
    if (!tag) {
      tag = arity === 'multi' ? Capability.make()(identifier) : Capability.makeSingleton()(identifier);
      cache.set(key, tag);
    }
    return tag;
  };
};

/**
 * Body models. `none` isolates the scheduler; `micro` suspends the fiber on a resolved promise,
 * which is what a warm dynamic `import()` costs — the shape that makes the scheduler interleave
 * rounds with in-flight loads the way it does at boot.
 */
const BODY = process.env.BODY ?? 'none';
const SUBSCRIBE = process.env.SUBSCRIBE === '1';
const DELAY_MS = Number(process.env.DELAY_MS ?? 10);

const buildPlugins = (spec) => {
  const tagOf = makeTagCache();
  const byPlugin = new Map();
  for (const module of spec) {
    const list = byPlugin.get(module.plugin) ?? [];
    list.push(module);
    byPlugin.set(module.plugin, list);
  }
  const plugins = [];
  for (const [name, modules] of byPlugin) {
    const key = `org.dxos.bench.${name.replace(/[^a-zA-Z0-9]/g, '')}`;
    let builder = Plugin.define(Plugin.makeMeta({ key: DXN.make(key), name }));
    modules.forEach((module, index) => {
      const provides = module.provides.map(tagOf);
      builder = Plugin.addModule(builder, {
        id: `m${index}`,
        activatesOn: module.startup ? ActivationEvents.Startup : ActivationEvents.Idle,
        requires: module.requires.map(tagOf),
        provides,
        activate: () =>
          BODY === 'delay'
            ? Effect.flatMap(
                Effect.promise(() => new Promise((resolve) => setTimeout(resolve, DELAY_MS))),
                () => Effect.succeed(provides.map((tag) => Capability.contribute(tag, { v: 1 }))),
              )
            : BODY === 'micro'
              ? Effect.flatMap(
                  Effect.promise(() => Promise.resolve()),
                  () => Effect.succeed(provides.map((tag) => Capability.contribute(tag, { v: 1 }))),
                )
              : Effect.succeed(provides.map((tag) => Capability.contribute(tag, { v: 1 }))),
      });
    });
    plugins.push(Plugin.make(builder)());
  }
  return plugins;
};

const runOnce = async (spec) => {
  const plugins = buildPlugins(spec);
  const byId = new Map(plugins.map((plugin) => [plugin.meta.profile.key, plugin]));

  const constructStart = performance.now();
  const manager = PluginManager.make({
    pluginLoader: (id) => Effect.succeed({ plugin: byId.get(id) }),
    plugins,
    enabled: [...byId.keys()],
    activationTimeout: 5000,
  });
  const constructMs = performance.now() - constructStart;

  // Real consumers keep derived indexes over the multi capabilities (SurfaceManager's role index,
  // the app-graph builder set, the i18n translator), so every contribution invalidates and
  // recomputes them. Without a subscriber the registry's atom writes are free and the bench
  // undercounts what a growing population actually costs.
  const disposers = [];
  if (SUBSCRIBE) {
    const tagOf = makeTagCache();
    const families = new Set(
      spec.flatMap((module) => module.provides.filter((c) => c.arity === 'multi').map((c) => c.identifier)),
    );
    for (const identifier of families) {
      const atom = manager.capabilities.atom(tagOf({ identifier, arity: 'multi' }));
      let index = new Map();
      disposers.push(
        manager.registry.subscribe(atom, (values) => {
          // Mirror SurfaceManager.indexByRole: rebuild a bucket index over the whole collection.
          const next = new Map();
          for (const value of values.flat()) {
            const bucket = next.get(identifier) ?? [];
            bucket.push(value);
            next.set(identifier, bucket);
          }
          index = next;
        }),
      );
    }
  }

  const startupStart = performance.now();
  await Effect.runPromise(manager.start());
  const startupMs = performance.now() - startupStart;

  const idleStart = performance.now();
  await Effect.runPromise(manager.activate(ActivationEvents.Idle));
  const idleMs = performance.now() - idleStart;

  const activated = manager.getActive().length;
  disposers.forEach((dispose) => dispose());
  await Effect.runPromise(manager.shutdown());
  return { constructMs, startupMs, idleMs, totalMs: constructMs + startupMs + idleMs, activated };
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const measure = async (label, spec) => {
  const runs = [];
  for (let index = 0; index < REPEATS; index++) {
    runs.push(await runOnce(spec));
    globalThis.gc?.();
  }
  const pick = (field) => median(runs.map((run) => run[field]));
  const activated = runs[0].activated;
  if (activated !== spec.length) {
    console.error(`  !! ${label}: activated ${activated} of ${spec.length} — graph not fully satisfiable`);
  }
  return {
    label,
    modules: spec.length,
    bootPass: spec.filter((module) => module.startup).length,
    constructMs: pick('constructMs'),
    startupMs: pick('startupMs'),
    idleMs: pick('idleMs'),
    totalMs: pick('totalMs'),
    activated,
    samples: runs.map((run) => Math.round(run.totalMs)),
  };
};

const table = (rows, columns) => {
  const head = columns.map((column) => column.head);
  const body = rows.map((row) => columns.map((column) => column.get(row)));
  const widths = head.map((_, index) => Math.max(...[head, ...body].map((cells) => cells[index].length)));
  const line = (cells) => cells.map((cell, index) => cell.padEnd(widths[index])).join('  ');
  console.log(line(head));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  body.forEach((cells) => console.log(line(cells)));
};

const COLUMNS = [
  { head: 'scenario', get: (row) => row.label },
  { head: 'modules', get: (row) => String(row.modules) },
  { head: 'boot pass', get: (row) => String(row.bootPass) },
  { head: 'construct', get: (row) => row.constructMs.toFixed(1) },
  { head: 'start()', get: (row) => row.startupMs.toFixed(1) },
  { head: 'idle', get: (row) => row.idleMs.toFixed(1) },
  { head: 'total ms', get: (row) => row.totalMs.toFixed(1) },
  { head: 'runs', get: (row) => row.samples.join(',') },
];

const main = async () => {
  const scenario = process.argv[2] ?? 'families';
  console.log(
    `scenario=${scenario} body=${BODY}${BODY === 'delay' ? `(${DELAY_MS}ms)` : ''} subscribers=${SUBSCRIBE} repeats=${REPEATS} node=${process.version}\n`,
  );

  if (scenario === 'families') {
    const rows = [
      await measure('full (all families)', buildSpec({ mapPath: MAP_PATH })),
      await measure('manifest: index+value', buildSpec({ mapPath: MAP_PATH, drop: MANIFEST_FAMILIES })),
      await measure('manifest + settings', buildSpec({ mapPath: MAP_PATH, drop: MANIFEST_FAMILIES_PLUS_SETTINGS })),
    ];
    table(rows, COLUMNS);
    const [full, manifest] = rows;
    const deltaMs = full.totalMs - manifest.totalMs;
    const deltaModules = full.modules - manifest.modules;
    console.log(
      `\ndelta: ${deltaMs.toFixed(1)} ms (${((deltaMs / full.totalMs) * 100).toFixed(1)}%) ` +
        `for ${deltaModules} fewer modules => ${(deltaMs / deltaModules).toFixed(3)} ms/module scheduler cost`,
    );
  }

  if (scenario === 'waves') {
    const rows = [
      await measure('full (today default waves)', buildSpec({ mapPath: MAP_PATH, wave: 'default' })),
      await measure(
        'manifest (today default waves)',
        buildSpec({ mapPath: MAP_PATH, drop: MANIFEST_FAMILIES, wave: 'default' }),
      ),
    ];
    table(rows, COLUMNS);
  }

  if (scenario === 'sweep') {
    const rows = [];
    for (const scale of [1, 2, 3, 4, 6]) {
      rows.push(await measure(`x${scale}`, buildSpec({ mapPath: MAP_PATH, scale })));
    }
    table(rows, COLUMNS);
    console.log('\nper-module scheduler cost by population size:');
    rows.forEach((row) =>
      console.log(`  ${String(row.modules).padStart(5)} modules   ${(row.totalMs / row.modules).toFixed(3)} ms/module`),
    );
  }
};

await main();

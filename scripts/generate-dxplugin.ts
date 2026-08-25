//
// Copyright 2026 DXOS.org
//

/**
 * Generates a plugin's `dxplugin.jsonc` from its existing TypeScript entrypoint.
 *
 * The two halves of a module declaration live in different places and only one of them survives
 * to runtime: the activation spec (requires/provides/activatesOn) is on the constructed `Plugin`,
 * while the module's source file is inside an opaque `() => import('./x')` closure. So the spec is
 * read by evaluating the plugin, and the `src` is recovered by scanning the capabilities barrel
 * for the import each exported module name is declared with.
 *
 * Usage: `pnpm vite-node scripts/generate-dxplugin.ts -- packages/plugins/plugin-markdown`
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { type Plugin } from '@dxos/app-framework';
import { type Config2 } from '@dxos/protocols';

const CAPABILITIES_BARREL = 'src/capabilities/index.ts';

/** Restores the extension a `./x` module specifier elides; the descriptor names a real file. */
const withExtension = (packageDir: string, path: string): string =>
  ['', '.ts', '.tsx', '/index.ts', '/index.tsx']
    .map((suffix) => `${path}${suffix}`)
    .find((candidate) => existsSync(join(packageDir, candidate))) ?? path;

/** Maps each module name exported by the capabilities barrel to the file its loader imports. */
const readModuleSources = (packageDir: string): Map<string, string> => {
  const source = readFileSync(join(packageDir, CAPABILITIES_BARREL), 'utf-8');
  const sources = new Map<string, string>();
  // One export per module, each ending in a `() => import('./body')` loader; the export name ties
  // the loader back to the identifier the plugin entrypoint adds.
  for (const match of source.matchAll(/export const (\w+)[\s\S]*?import\('(\.[^']+)'\)/g)) {
    const [, name, path] = match;
    if (!sources.has(name)) {
      sources.set(name, withExtension(packageDir, path.replace(/^\.\//, './src/capabilities/')));
    }
  }
  return sources;
};

/**
 * The identifier each `Plugin.addModule(...)` call names, in source order.
 *
 * Positional rather than by name: a module's runtime name comes from its maker's default (`schema`,
 * `Settings`) and routinely differs from the barrel export it was added as, whereas the entrypoint's
 * call order and the constructed plugin's module order are the same list by construction.
 */
const readAddedModules = (entryPath: string): string[] =>
  [...readFileSync(entryPath, 'utf-8').matchAll(/Plugin\.addModule\(\s*([\w.]+)/g)].map(([, name]) => name);

const toCapabilityRefs = (tags: readonly { identifier: string; arity: string }[]): Config2.CapabilityRef[] =>
  tags.map((tag) => (tag.arity === 'multi' ? tag.identifier : { id: tag.identifier, arity: 'single' as const }));

// Activation events are DXNs at runtime; the descriptor stores the bare NSID that `DXN.make`
// takes, so the `dxn:` scheme comes off here rather than being re-parsed on every load.
const toNsid = (id: string): string => String(id).replace(/^dxn:/, '');

const toEventRef = (event: { id: string; specifier?: string }) =>
  event.specifier === undefined ? toNsid(event.id) : { id: toNsid(event.id), specifier: event.specifier };

const toActivationRef = (events: any): Config2.ActivationRef | undefined => {
  if (!events) {
    return undefined;
  }
  if (events.type === 'one-of') {
    return { oneOf: events.events.map(toEventRef) };
  }
  if (events.type === 'all-of') {
    return { allOf: events.events.map(toEventRef) };
  }
  // The idle wave is the default an omitted `activatesOn` normalizes to, so it is left unstated.
  return toNsid(events.id) === 'org.dxos.app-framework.event.idle' ? undefined : toEventRef(events);
};

export const generate = async (packageDir: string, overrides: Map<string, string>): Promise<string> => {
  // The import is extensionless so vite picks the platform variant; the source scan needs the file.
  const entryPath = ['src/plugin.tsx', 'src/plugin.ts']
    .map((candidate) => join(packageDir, candidate))
    .find((candidate) => existsSync(candidate));
  if (!entryPath) {
    throw new Error(`No src/plugin.{ts,tsx} in ${packageDir}.`);
  }
  const { default: factory }: { default: Plugin.PluginFactory<any> } = await import(
    join(process.cwd(), packageDir, 'src/plugin')
  );
  const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8'));
  const sources = readModuleSources(packageDir);
  const added = readAddedModules(entryPath);
  const plugin = factory({});
  const key = plugin.meta.profile.key;
  if (added.length !== plugin.modules.length) {
    throw new Error(`Entrypoint adds ${added.length} modules but the plugin has ${plugin.modules.length}.`);
  }

  const modules = plugin.modules.map((module, index) => {
    const name = module.id.slice(`${key}.module.`.length);
    const src = overrides.get(name) ?? sources.get(added[index]);
    if (!src) {
      throw new Error(
        `No loader for module '${name}' (added as '${added[index]}'); pass --src ${name}=./src/... to supply one.`,
      );
    }
    const activatesOn = toActivationRef(module.activation.activatesOn);
    const requires = toCapabilityRefs(module.activation.requires);
    const provides = toCapabilityRefs(module.activation.provides);
    return {
      id: name,
      src,
      ...(activatesOn ? { activatesOn } : {}),
      ...(requires.length ? { requires } : {}),
      ...(provides.length ? { provides } : {}),
    };
  });

  const { key: _key, ...profile } = plugin.meta.profile;
  return `${JSON.stringify({ key, ...profile, version, modules }, null, 2)}\n`;
};

const [packageDir, ...rest] = process.argv.slice(2);
if (packageDir) {
  // `--src <moduleName>=<path>` supplies the file for a module the entrypoint declares inline
  // (e.g. `AppCapability.translations([...])`), which has no loader to scan for.
  const overrides = new Map(
    rest
      .filter((_arg, index) => rest[index - 1] === '--src')
      .map((pair) => {
        const [name, path] = pair.split('=');
        return [name, path] as const;
      }),
  );
  const target = join(packageDir, 'dxplugin.jsonc');
  writeFileSync(target, await generate(packageDir, overrides));
  // eslint-disable-next-line no-console
  console.log(`Wrote ${relative(process.cwd(), target)}`);
}

//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import * as Schema from 'effect/Schema';
import * as Yaml from 'yaml';

import { DX_CONFIG } from '@dxos/client-protocol';
import { Config2 } from '@dxos/protocols';

// TODO(wittjosiah): Factor out to app-framework?

/**
 * Where a third-party plugin came from, and how the CLI should treat the bytes on disk.
 *
 * The distinction is copy versus reference, and it outlives the install: a `copy` is a snapshot the
 * CLI owns under `plugins/<id>/` and `remove` deletes, while a `link` points at a directory the
 * user owns, so edits reach the plugin and `remove` only forgets it.
 */
export const InstallSourceSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('copy'),
    /** Manifest URL the snapshot was taken from. */
    origin: Schema.String,
    version: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literal('link'),
    /** Absolute path to the directory the plugin is read from in place. */
    path: Schema.String,
  }),
]);
export type InstallSource = Schema.Schema.Type<typeof InstallSourceSchema>;

/**
 * One plugin's persisted state for a profile.
 *
 * A record with no `source` is a compiled-in plugin whose enabled state is being recorded; a record
 * with one is a third-party install. `meta` caches what the manifest (or `dx.config.ts`) said at
 * install time so startup can register the plugin without reading — let alone importing — anything
 * from disk. It goes stale if a dev plugin's own metadata changes, which re-running `add --dev`
 * fixes; plugin code changes need no reinstall, only metadata does.
 */
export const PluginRecordSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  enabled: Schema.optional(Schema.Boolean),
  source: Schema.optional(InstallSourceSchema),
  meta: Schema.optional(Config2.Plugin),
  /** Module the loader imports, absolute or relative to the install directory. */
  entry: Schema.optional(Schema.String),
});
export type PluginRecord = Schema.Schema.Type<typeof PluginRecordSchema>;

/**
 * The file's two accepted shapes. The legacy form — a bare list of enabled ids — predates
 * third-party installs and is still written by any older `dx` on the machine, so it is decoded
 * rather than rejected: a failed decode falls back to the defaults, which would silently discard
 * the user's choices.
 */
const PluginsFileSchema = Schema.Union([
  Schema.Struct({ plugins: Schema.Array(PluginRecordSchema) }),
  Schema.Array(Schema.String),
]);

/** CLI-only: path to plugins/<profile>.yml (sibling to profile/). */
const getPluginsConfigPath = (profile: string) => `${DX_CONFIG}/plugins/${profile}.yml`;

/** Directory holding the assets of a `url`-installed plugin. */
export const getPluginInstallPath = (id: string) => `${DX_CONFIG}/plugins/${id}`;

/** True when the record's plugin contributes at startup. Absent `enabled` means enabled. */
export const isRecordEnabled = (record: PluginRecord): boolean => record.enabled !== false;

/**
 * Load a profile's plugin records.
 *
 * Returns `undefined` when the profile has never been configured (or its file is unreadable),
 * which is what the caller turns into the default set. An empty list is a distinct answer — the
 * user disabled everything optional — and collapsing the two would silently restore the defaults
 * on the next command.
 */
export const loadPlugins = Effect.fn(function* ({ profile }: { profile: string }) {
  const fs = yield* FileSystem.FileSystem;
  const pluginsPath = getPluginsConfigPath(profile);

  const content = yield* fs
    .readFileString(pluginsPath)
    .pipe(Effect.catchTag('PlatformError', () => Effect.succeed(undefined)));
  if (content === undefined) {
    return undefined;
  }

  const raw = yield* Effect.try(() => Yaml.parse(content)).pipe(Effect.catch(() => Effect.succeed(undefined)));
  if (raw === undefined || raw === null) {
    return undefined;
  }

  return yield* Schema.decodeUnknownEffect(PluginsFileSchema)(raw).pipe(
    Effect.map((decoded): PluginRecord[] =>
      'plugins' in decoded ? decoded.plugins.map((record) => ({ ...record })) : decoded.map((id) => ({ id })),
    ),
    Effect.catch(() => Effect.succeed(undefined)),
  );
});

/**
 * Write a profile's plugin records.
 *
 * `core` names plugins the host pins on; a record for one is dropped unless it carries install
 * state, because the file records the user's choices about what is optional and a persisted core
 * id would outlive a host that later stops pinning it.
 */
export const savePlugins = Effect.fn(function* ({
  profile,
  plugins,
  core = [],
}: {
  profile: string;
  plugins: readonly PluginRecord[];
  core?: readonly string[];
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const pluginsPath = getPluginsConfigPath(profile);
  yield* fs.makeDirectory(path.dirname(pluginsPath), { recursive: true });
  const retained = plugins.filter((record) => record.source !== undefined || !core.includes(record.id));
  yield* fs.writeFileString(pluginsPath, Yaml.stringify({ plugins: retained }));
});

/**
 * Load a profile's enabled plugin ids.
 *
 * Kept alongside {@link loadPlugins} because the enabled set is what the plugin manager takes, and
 * every caller that only needs it would otherwise repeat the same filter.
 */
export const loadEnabledPlugins = Effect.fn(function* ({ profile }: { profile: string }) {
  const records = yield* loadPlugins({ profile });
  return records?.filter(isRecordEnabled).map((record) => record.id);
});

/**
 * Rewrite a profile's records so exactly `enabled` are enabled, preserving install state.
 *
 * Takes the manager's enabled set rather than a single id so the caller does not have to reason
 * about dependency closures — enabling one plugin can enable several.
 *
 * A record outside `registered` keeps its stored value, because the enabled set could never have
 * contained a plugin the host failed to register and rewriting from it would turn a load failure
 * into a silent, permanent disable.
 */
export const saveEnabledPlugins = Effect.fn(function* ({
  profile,
  enabled,
  registered,
  core = [],
}: {
  profile: string;
  enabled: readonly string[];
  registered?: readonly string[];
  core?: readonly string[];
}) {
  const existing = (yield* loadPlugins({ profile })) ?? [];
  const stored = new Set(existing.map((record) => record.id));
  const host = registered && new Set(registered);
  const plugins: PluginRecord[] = [
    ...existing.map((record) =>
      host && !host.has(record.id) ? record : { ...record, enabled: enabled.includes(record.id) },
    ),
    ...enabled.filter((id) => !stored.has(id)).map((id) => ({ id, enabled: true })),
  ];
  yield* savePlugins({ profile, plugins, core });
});

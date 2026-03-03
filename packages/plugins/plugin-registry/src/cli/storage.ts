//
// Copyright 2025 DXOS.org
//

import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { DX_CONFIG, getProfilePath } from '@dxos/client-protocol';

// TODO(wittjosiah): Factor out to app-framework?

const PLUGINS_FILE = 'plugins.json';

const PluginsSchema = Schema.Array(Schema.String);

/**
 * Get the path to the plugins configuration file for a profile.
 */
const getPluginsPath = (profile: string): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    return path.join(getProfilePath(DX_CONFIG, profile), PLUGINS_FILE);
  });

/**
 * Load enabled plugins from profile storage.
 * Returns the list of enabled plugin IDs, or an empty array if the file doesn't exist.
 */
export const loadEnabledPlugins = Effect.fn(function* ({ profile }: { profile: string }) {
  const fs = yield* FileSystem.FileSystem;
  const pluginsPath = yield* getPluginsPath(profile);

  const content = yield* fs
    .readFileString(pluginsPath)
    .pipe(Effect.catchTag('SystemError', () => Effect.succeed('[]')));

  const parsed = yield* Schema.decodeUnknown(Schema.parseJson(PluginsSchema))(content).pipe(
    Effect.catchAll(() => Effect.succeed([] as string[])),
  );

  return parsed;
});

/**
 * Save enabled plugins to profile storage.
 */
export const saveEnabledPlugins = Effect.fn(function* ({ profile, enabled }: { profile: string; enabled: string[] }) {
  const fs = yield* FileSystem.FileSystem;
  const pluginsPath = yield* getPluginsPath(profile);
  const profileDir = getProfilePath(DX_CONFIG, profile);

  yield* fs.makeDirectory(profileDir, { recursive: true });
  const encoded = Schema.encodeSync(Schema.parseJson(PluginsSchema))(enabled);
  yield* fs.writeFileString(pluginsPath, encoded + '\n');
});

//
// Copyright 2025 DXOS.org
//

import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Yaml from 'yaml';

import { DX_CONFIG } from '@dxos/client-protocol';

// TODO(wittjosiah): Factor out to app-framework?

const PluginsSchema = Schema.Array(Schema.String);

/** CLI-only: path to plugins/<profile>.yml (sibling to profile/). */
const getPluginsConfigPath = (profile: string) => `${DX_CONFIG}/plugins/${profile}.yml`;

/**
 * Load enabled plugins from plugins/<profile>.yml (sibling to profile/).
 * Returns the list of enabled plugin IDs, or an empty array if the file doesn't exist.
 */
export const loadEnabledPlugins = Effect.fn(function* ({ profile }: { profile: string }) {
  const fs = yield* FileSystem.FileSystem;
  const pluginsPath = getPluginsConfigPath(profile);

  const content = yield* fs
    .readFileString(pluginsPath)
    .pipe(Effect.catchTag('SystemError', () => Effect.succeed('[]')));

  const raw = Yaml.parse(content);
  const parsed = yield* Schema.decodeUnknown(PluginsSchema)(raw ?? []).pipe(
    Effect.catchAll(() => Effect.succeed([] as string[])),
  );

  return parsed;
});

/**
 * Save enabled plugins to plugins/<profile>.yml.
 */
export const saveEnabledPlugins = Effect.fn(function* ({ profile, enabled }: { profile: string; enabled: string[] }) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const pluginsPath = getPluginsConfigPath(profile);
  yield* fs.makeDirectory(path.dirname(pluginsPath), { recursive: true });
  const encoded = Yaml.stringify(enabled);
  yield* fs.writeFileString(pluginsPath, encoded);
});

//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';
import * as Schema from 'effect/Schema';
import * as Yaml from 'yaml';

import { DX_CONFIG } from '@dxos/client-protocol';

// TODO(wittjosiah): Factor out to app-framework?

const PluginsSchema = Schema.Array(Schema.String);

/** CLI-only: path to plugins/<profile>.yml (sibling to profile/). */
const getPluginsConfigPath = (profile: string) => `${DX_CONFIG}/plugins/${profile}.yml`;

/**
 * Load enabled plugins from plugins/<profile>.yml (sibling to profile/).
 *
 * Returns `undefined` when the profile has never been configured (or its file is unreadable),
 * which is what the caller turns into the default set. An empty array is a distinct answer —
 * the user disabled everything optional — and collapsing the two would silently restore the
 * defaults on the next command.
 */
export const loadEnabledPlugins = Effect.fn(function* ({ profile }: { profile: string }) {
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

  return yield* Schema.decodeUnknownEffect(PluginsSchema)(raw).pipe(
    Effect.map((parsed) => [...parsed]),
    Effect.catch(() => Effect.succeed(undefined)),
  );
});

/**
 * Save enabled plugins to plugins/<profile>.yml.
 *
 * `core` names plugins the host pins on; they are dropped from the file because it records the
 * user's choices about what is optional, and a persisted core id would outlive a host that
 * later stops pinning it.
 */
export const saveEnabledPlugins = Effect.fn(function* ({
  profile,
  enabled,
  core = [],
}: {
  profile: string;
  enabled: string[];
  core?: readonly string[];
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const pluginsPath = getPluginsConfigPath(profile);
  yield* fs.makeDirectory(path.dirname(pluginsPath), { recursive: true });
  const encoded = Yaml.stringify(enabled.filter((id) => !core.includes(id)));
  yield* fs.writeFileString(pluginsPath, encoded);
});

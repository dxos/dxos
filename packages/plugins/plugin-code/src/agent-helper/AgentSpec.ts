//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

/** File each agent directory carries: what to run and which local tool it needs. */
export const MANIFEST = 'agent.json';

/** An agent's `agent.json`, as a plugin's helper-side entry ships it. */
export const Manifest = Schema.Struct({
  id: Schema.String,
  /** Script the helper runs with its own runtime, relative to the agent's directory. */
  entry: Schema.String,
  /** The command-line tool the agent drives, found on the user's path. */
  executable: Schema.optional(
    Schema.Struct({
      name: Schema.String,
      versionArgs: Schema.Array(Schema.String),
      /** Environment variable that tells the agent where the tool is. */
      env: Schema.optional(Schema.String),
    }),
  ),
});

export type Manifest = Schema.Schema.Type<typeof Manifest>;

/** A manifest with its entry resolved to an absolute path inside its own directory. */
export type AgentSpec = Omit<Manifest, 'entry'> & { entry: string };

/**
 * Reads every `<dir>/<agent>/agent.json`. An entry that resolves outside its directory is refused,
 * so the helper only ever runs files that shipped with the app.
 */
export const load = async (dir: string): Promise<AgentSpec[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const specs: AgentSpec[] = [];
  for (const entry of entries.filter((entry) => entry.isDirectory())) {
    const agentDir = resolve(dir, entry.name);
    const manifest = Schema.decodeUnknownSync(Manifest)(JSON.parse(await readFile(join(agentDir, MANIFEST), 'utf8')));
    const script = resolve(agentDir, manifest.entry);
    if (relative(agentDir, script).startsWith('..')) {
      throw new Error(`agent ${manifest.id}: entry escapes its directory`);
    }
    specs.push({ ...manifest, entry: script });
  }

  return specs;
};

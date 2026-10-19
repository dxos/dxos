#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Stages `dx-agent`, the coding-agent helper plugin-code compiles (`moon run
// plugin-code:compile-agent-helper`), and the agents plugins ship for it (each plugin's
// `dist/agent/<id>/`, e.g. `moon run plugin-claude:compile-agent`), where the desktop app bundles and
// spawns them. The helper reads its agents from the `agents/` directory beside itself.
//
// Usage: node scripts/stage-agent-helper.mjs [--required]
//   --required  fail when anything has not been built (release builds). Without it (`tauri dev`)
//               missing pieces are built here with bun, and a failure to do so is only a warning:
//               coding agents then report that they cannot start.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcTauriDir = join(appDir, 'src-tauri');
const pluginsDir = join(appDir, '..', '..', 'plugins');
const required = process.argv.includes('--required');

/** The helper, and how to build it when missing. */
const helper = {
  file: join(pluginsDir, 'plugin-code', 'dist', 'sidecar', 'dx-agent'),
  plugin: join(pluginsDir, 'plugin-code'),
  script: './scripts/build-agent-helper.ts',
};

/** Plugins that ship an agent for the helper, and the script that builds it. */
const agents = [{ plugin: join(pluginsDir, 'plugin-claude'), script: './scripts/build-agent.ts' }];

const ensure = (path, plugin, script) => {
  // `beforeDevCommand` runs outside moon, so the dev loop builds what is missing itself.
  if (!existsSync(path) && !required) {
    spawnSync('bun', [script], { cwd: plugin, stdio: 'inherit' });
  }
  if (!existsSync(path)) {
    const message = `${path} is not built; run \`bun ${script}\` in ${plugin}.`;
    if (required) {
      console.error(message);
      process.exit(1);
    }
    console.warn(`${message} Coding agents will be unavailable.`);
    process.exit(0);
  }
};

ensure(helper.file, helper.plugin, helper.script);
for (const agent of agents) {
  ensure(join(agent.plugin, 'dist', 'agent'), agent.plugin, agent.script);
}

const stage = async (dir) => {
  await rm(dir, { recursive: true, force: true });
  await mkdir(join(dir, 'agents'), { recursive: true });
  await cp(helper.file, join(dir, 'dx-agent'));
  await chmod(join(dir, 'dx-agent'), 0o755);
  for (const agent of agents) {
    await cp(join(agent.plugin, 'dist', 'agent'), join(dir, 'agents'), { recursive: true });
  }
};

// Bundled from here by `bundle.macOS.files` (tauri.conf.json).
await stage(join(srcTauriDir, 'agent'));
// Dev: `bundle.macOS.files` is not applied and `$RESOURCE` resolves to `target/<profile>/`, so the
// helper and its `agents/` directory sit there side by side.
for (const profile of ['debug', 'release']) {
  const dir = join(srcTauriDir, 'target', profile);
  await mkdir(join(dir, 'agents'), { recursive: true });
  await cp(helper.file, join(dir, 'dx-agent'));
  await chmod(join(dir, 'dx-agent'), 0o755);
  for (const agent of agents) {
    await cp(join(agent.plugin, 'dist', 'agent'), join(dir, 'agents'), { recursive: true });
  }
}

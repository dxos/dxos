//
// Copyright 2026 DXOS.org
//

import { type Freeze, readFreeze, removeFreeze, writeFreeze } from '../score/freeze.ts';
import { TARGETS } from './targets.ts';
import { HarnessError, harnessHash, workspaceRoot } from './workspace.ts';

/**
 * Pins the harness for an optimization loop: the edit hook then refuses changes to its files, the
 * budget writers refuse to run, and `compare` voids any verdict measured after the harness moved.
 */
export const freeze = ({ target: name }: { target: string }): number => {
  const target = TARGETS[name];
  if (!target) {
    throw new HarnessError(`unknown target "${name}"; known: ${Object.keys(TARGETS).join(', ')}`);
  }
  const root = workspaceRoot();
  const current = readFreeze(root);
  if (current) {
    process.stdout.write(`already frozen since ${current.since} (harness ${current.hash})\n`);
    return 0;
  }
  const state: Freeze = {
    hash: harnessHash(root, target.harness),
    paths: target.harness,
    since: new Date().toISOString(),
  };
  writeFreeze(root, state);
  process.stdout.write(
    `froze harness ${state.hash}: ${state.paths.length} paths are read-only until \`pnpm perf thaw\`\n`,
  );
  return 0;
};

export const thaw = (): number => {
  const { removed, freeze } = removeFreeze(workspaceRoot());
  process.stdout.write(
    freeze
      ? `thawed harness ${freeze.hash} (frozen since ${freeze.since})\n`
      : removed
        ? 'removed a malformed freeze record\n'
        : 'not frozen\n',
  );
  return 0;
};

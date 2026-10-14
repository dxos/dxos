//
// Copyright 2026 DXOS.org
//

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Workspace-relative; written by `pnpm perf freeze`, read by the CLI, the edit hook and the budget writers. */
export const FREEZE_FILE = '.perf/frozen';

/** The harness as it stood when frozen: its hash, and the paths an optimization loop may not edit. */
export type Freeze = { hash: string; paths: string[]; since: string };

const isFreeze = (value: unknown): value is Freeze =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'hash') === 'string' &&
  typeof Reflect.get(value, 'since') === 'string' &&
  Array.isArray(Reflect.get(value, 'paths'));

export const readFreeze = (workspaceRoot: string): Freeze | undefined => {
  const file = path.join(workspaceRoot, FREEZE_FILE);
  if (!existsSync(file)) {
    return undefined;
  }
  const freeze: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isFreeze(freeze)) {
    throw new Error(`malformed ${FREEZE_FILE}; remove it with \`pnpm perf thaw\``);
  }
  return freeze;
};

/** Renamed into place from a temporary file, so the hook and the CLI never read half a record. */
export const writeFreeze = (workspaceRoot: string, freeze: Freeze): void => {
  const file = path.join(workspaceRoot, FREEZE_FILE);
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(freeze, null, 2) + '\n');
  renameSync(temporary, file);
};

/** Removes the record, malformed or not, with what it held when it could be read. */
export const removeFreeze = (workspaceRoot: string): { removed: boolean; freeze?: Freeze } => {
  const file = path.join(workspaceRoot, FREEZE_FILE);
  if (!existsSync(file)) {
    return { removed: false };
  }
  let freeze: Freeze | undefined;
  try {
    freeze = readFreeze(workspaceRoot);
  } catch {
    // Malformed: the error that reports it tells the user to thaw, so thaw removes it all the same.
  }
  rmSync(file, { force: true });
  return { removed: true, ...(freeze ? { freeze } : {}) };
};

/** Refuses `action` while the harness is frozen, so a loop cannot rewrite the targets it is scored against. */
export const assertNotFrozen = (workspaceRoot: string, action: string): void => {
  const freeze = readFreeze(workspaceRoot);
  if (freeze) {
    throw new Error(
      `${action} refused: the perf harness has been frozen since ${freeze.since}; \`pnpm perf thaw\` first`,
    );
  }
};

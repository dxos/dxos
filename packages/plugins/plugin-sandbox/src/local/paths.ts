//
// Copyright 2026 DXOS.org
//

import { isAbsolute, join, normalize, relative, sep } from 'node:path';

/**
 * The path EDGE sandboxes mount their persistent storage at. Local sandboxes have no mount
 * namespace to put it there, so the prefix is mapped onto the sandbox's own directory instead,
 * and callers written against EDGE paths keep working.
 */
export const WORKSPACE_PATH = '/workspace';

/**
 * Maps a sandbox path to the host path it lives at: `/workspace/…` and relative paths resolve
 * inside `workspaceDir`. Any other absolute path, or one that climbs out with `..`, is refused —
 * file transfer must never become a way to read or write the host outside the sandbox.
 */
export const resolveSandboxPath = (workspaceDir: string, path: string): string => {
  const inner =
    path === WORKSPACE_PATH || path.startsWith(`${WORKSPACE_PATH}/`)
      ? path.slice(WORKSPACE_PATH.length)
      : isAbsolute(path)
        ? undefined
        : path;
  if (inner === undefined) {
    throw new Error(`Path is outside the sandbox workspace (${WORKSPACE_PATH}): ${path}`);
  }

  const resolved = normalize(join(workspaceDir, inner));
  const offset = relative(workspaceDir, resolved);
  if (offset === '..' || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`Path escapes the sandbox workspace: ${path}`);
  }
  return resolved;
};

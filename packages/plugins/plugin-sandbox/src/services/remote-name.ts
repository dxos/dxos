//
// Copyright 2026 DXOS.org
//

/** Git remote names sandbox-service accepts: what `git push <name>` in the sandbox addresses. */
const REMOTE_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/**
 * The git remote name for a repository attached to a sandbox: its display name as a slug, or its id
 * when that leaves nothing usable, suffixed where it would collide with a name already `taken`.
 */
export const remoteName = (
  repository: { id: string; name?: string },
  taken: ReadonlySet<string> = new Set(),
): string => {
  const slug = (repository.name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .replace(/-+$/, '')
    .slice(0, 48);
  const base = REMOTE_NAME.test(slug) ? slug : `repo-${repository.id.slice(-8).toLowerCase()}`;
  let name = base;
  for (let index = 2; taken.has(name); index++) {
    name = `${base}-${index}`;
  }
  return name;
};

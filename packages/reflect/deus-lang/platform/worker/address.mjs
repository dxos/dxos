//
// Copyright 2026 DXOS.org
//

// Project addresses (D184, D185, Address.Spec): `@owner/project`, where the owner is a GitHub login. A
// project lives in the bucket folder `<owner>/<project>/`, except projects older than addresses,
// which keep their folder; this mirrors `Address.folder` and `Address.legacyFolders`.

/** `[a-z0-9]`, then up to `max - 1` of `[a-z0-9-]`, not ending in `-` (`Address.isSlug`). */
const slug = (max) => new RegExp(`^[a-z0-9](?:[a-z0-9-]{0,${max - 2}}[a-z0-9])?$`);

const OWNER = slug(39);

const PROJECT = slug(63);

/** A folder from before addresses, still answered at `/v1/<folder>`. */
const LEGACY = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** Projects whose folder predates addresses (`Address.legacyFolders`). */
const LEGACY_FOLDERS = new Map([['@dxos/toolchain', 'toolchain']]);

const LEGACY_ADDRESSES = new Map([...LEGACY_FOLDERS].map(([address, folder]) => [folder, address]));

/**
 * The project a path names, from its leading segments: `@owner`, `project` or a legacy folder.
 * Returns the project and how many segments it used, or undefined when they name none.
 */
export const projectAt = (segments) => {
  const [first = '', second = ''] = segments;
  if (first.startsWith('@')) {
    const owner = first.slice(1);
    if (!OWNER.test(owner) || !PROJECT.test(second)) {
      return undefined;
    }
    const address = `@${owner}/${second}`;
    return { address, folder: LEGACY_FOLDERS.get(address) ?? `${owner}/${second}`, used: 2 };
  }
  if (!LEGACY.test(first)) {
    return undefined;
  }
  return { address: LEGACY_ADDRESSES.get(first), folder: first, used: 1 };
};

/** The project whose folder is `folder`, so a key granted either name may write to it. */
export const addressOfFolder = (folder) =>
  LEGACY_ADDRESSES.get(folder) ?? (folder.includes('/') ? `@${folder}` : undefined);

/** A project a key may be granted: an address, or a legacy folder name. */
export const isGrantable = (project) =>
  typeof project === 'string' &&
  (LEGACY.test(project) ||
    (project.startsWith('@') && projectAt(project.split('/'))?.used === 2 && project.split('/').length === 2));

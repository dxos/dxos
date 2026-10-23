//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Promise-based because both hosts' lookups are asynchronous: Node's fs on a dev server, Tauri commands on the desktop.

/** The two lookups real-path resolution needs from a host. Paths are POSIX and absolute. */
export type Resolver = {
  /** The real path of an existing entry, or undefined when nothing exists there (a dangling link included). */
  canonicalize: (path: string) => Promise<string | undefined>;
  /** A symlink's target as stored, or undefined when `path` is not a symlink. */
  readLink: (path: string) => Promise<string | undefined>;
};

/** The same bound the OS applies to a chain of links, so a link cycle cannot recurse forever. */
const MAX_LINKS = 40;

/** `path` with `.`, `..` and repeated slashes removed lexically. */
export const normalize = (path: string): string => {
  const segments: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '..') {
      segments.pop();
    } else if (segment !== '' && segment !== '.') {
      segments.push(segment);
    }
  }
  return `/${segments.join('/')}`;
};

const dirname = (path: string): string => path.slice(0, path.lastIndexOf('/')) || '/';

const basename = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

const join = (dir: string, name: string): string => (dir === '/' ? `/${name}` : `${dir}/${name}`);

/**
 * The real path of the absolute `path`, following every symlink: the nearest existing ancestor's real path with the
 * missing tail re-appended, and a dangling link resolved through its target, so a write cannot follow a link out.
 */
export const resolve = async (resolver: Resolver, path: string, depth = 0): Promise<string> => {
  const file = normalize(path);
  const real = await resolver.canonicalize(file);
  if (real !== undefined) {
    return real;
  }
  const parent = dirname(file);
  if (parent === file) {
    return file;
  }
  const realParent = await resolve(resolver, parent, depth);
  const target = depth < MAX_LINKS ? await resolver.readLink(file) : undefined;
  if (target !== undefined) {
    // A relative target is relative to the link's real directory, not to the alias it was reached through.
    return resolve(resolver, target.startsWith('/') ? target : join(realParent, target), depth + 1);
  }
  return join(realParent, basename(file));
};

/** Whether the real path `real` is `root` or lies under it. */
export const isWithin = (root: string, real: string): boolean =>
  real === root || real.startsWith(root === '/' ? '/' : `${root}/`);

/**
 * The real path of `path` when it lies inside one of `roots`, else undefined. Callers read and write the returned
 * path, so a check on it (such as a suffix rule) applies to a link's target, not to the alias.
 */
export const contain = async (
  resolver: Resolver,
  roots: readonly string[],
  path: string,
): Promise<string | undefined> => {
  if (!path.startsWith('/')) {
    return undefined;
  }
  const real = await resolve(resolver, path);
  const realRoots = await Promise.all(
    roots.filter((root) => root.startsWith('/')).map((root) => resolve(resolver, root)),
  );
  return realRoots.some((root) => isWithin(root, real)) ? real : undefined;
};

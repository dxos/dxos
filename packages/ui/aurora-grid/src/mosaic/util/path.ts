//
// Copyright 2023 DXOS.org
//

const SEPARATOR = '/';

export const Path = {
  create: (...args: string[]) => args.join(SEPARATOR),
  first: (path: string) => path.split(SEPARATOR)[0] ?? path,
  last: (path: string) => path.split(SEPARATOR).at(-1) ?? path,
  hasRoot: (path: string, id: string) => Path.first(path) === id,
  // TODO(burdon): Standardize path as first property (e.g., change to descendantOf?)
  hasDescendent: (parent: string, path: string) => path !== parent && path.startsWith(parent),
  hasChild: (parent: string, path: string) => Path.parent(path) === parent,
  parent: (path: string) => path.split(SEPARATOR).slice(0, -1).join(SEPARATOR),
  length: (path: string) => path.split(SEPARATOR).length,
};

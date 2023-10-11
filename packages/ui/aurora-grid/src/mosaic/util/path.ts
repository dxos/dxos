//
// Copyright 2023 DXOS.org
//

export const Path = {
  create: (...args: string[]) => args.join('/'),
  first: (path: string) => path.split('/')[0] ?? path,
  last: (path: string) => path.split('/').at(-1) ?? path,
  hasRoot: (path: string, id: string) => Path.first(path) === id,
  hasDescendent: (parent: string, path: string) => path !== parent && path.startsWith(parent),
  hasChild: (parent: string, path: string) => Path.parent(path) === parent,
  parent: (path: string) => path.split('/').slice(0, -1).join('/'),
  length: (path: string) => path.split('/').length,
};

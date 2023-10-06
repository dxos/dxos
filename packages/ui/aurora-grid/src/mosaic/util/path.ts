//
// Copyright 2023 DXOS.org
//

export const Path = {
  create: (...args: string[]) => args.join('/'),
  // TODO(wittjosiah): Remove ?, should only be called on valid paths.
  first: (path: string) => path?.split('/')[0],
  last: (path: string) => path?.split('/').at(-1),
  hasRoot: (path: string, id: string) => Path.first(path) === id,
  hasDescendent: (parent: string, path: string) => path?.startsWith(parent),
  parent: (path: string) => path.split('/').slice(0, -2).join('/'),
};

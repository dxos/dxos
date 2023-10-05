//
// Copyright 2023 DXOS.org
//

export const Path = {
  create: (...args: string[]) => args.join('/'),
  first: (path: string) => path?.split('/')[0],
  last: (path: string) => path?.split('/').at(-1),
  hasRoot: (path: string, id: string) => Path.first(path) === id,
  hasDescendent: (parent: string, path: string) => path?.startsWith(parent),
};

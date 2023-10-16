//
// Copyright 2023 DXOS.org
//

const SEPARATOR = '/';

export const Path = {
  create: (...args: string[]) => args.join(SEPARATOR),

  parts: (path: string) => path.split(SEPARATOR),
  length: (path: string) => path.split(SEPARATOR).length,
  first: (path: string) => path.split(SEPARATOR)[0] ?? path,
  last: (path: string) => path.split(SEPARATOR).at(-1) ?? path,
  parent: (path: string) => path.split(SEPARATOR).slice(0, -1).join(SEPARATOR),

  hasRoot: (path: string, id: string) => Path.first(path) === id,
  hasChild: (path: string, compare: string) => Path.parent(compare) === path,
  hasDescendent: (path: string, compare: string) => compare !== path && compare.startsWith(path),
  onPath: (path: string, id: string) => Path.parts(path).includes(id),
};

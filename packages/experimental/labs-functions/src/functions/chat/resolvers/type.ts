//
// Copyright 2024 DXOS.org
//

export type Resolver = () => Promise<any>;

export type ResolverMap = {
  [key: string]: Resolver | ResolverMap;
};

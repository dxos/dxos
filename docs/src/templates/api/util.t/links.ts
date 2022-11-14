//
// Copyright 2022 DXOS.org
//

export const href = {
  package: (name: string) => `/api/${name}`,
  github: (repo: string, path: string) => `https://github.com/dxos/${repo}/blob/main/${path}`
};

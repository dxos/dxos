//
// Copyright 2023 DXOS.org
//

import { resolve } from 'node:path';

const knownPeerPackages = [
  '@braneframe/plugin-markdown',
  '@braneframe/plugin-stack',
  '@dxos/aurora',
  '@dxos/aurora-theme',
  '@dxos/react-appkit',
  '@dxos/react-shell',
  '@dxos/react-surface',
  '@dxos/aurora-composer',
  '@dxos/aurora-navtree',
];

const getPackageRootFromResolvedModule = (resolvedPath: string, packageName: string) => {
  const [, shortName] = packageName.split('/');
  if (!shortName) {
    throw new Error('invalid package name encountered ' + packageName);
  }
  const position = resolvedPath.indexOf(shortName);
  return resolvedPath.substring(0, position + shortName.length);
};

export const resolveKnownPeers = (content: string[], rootPath: string) => {
  const result = [...content];
  knownPeerPackages.forEach((packageName) => {
    if (result.some((contentPath) => contentPath.indexOf(packageName) >= 0)) {
      return;
    }
    try {
      const resolved = require.resolve(packageName, {
        paths: [rootPath],
      });
      if (!resolved) {
        return;
      }
      const packageRoot = getPackageRootFromResolvedModule(resolved, packageName);
      result.push(resolve(packageRoot, 'dist/**/*.mjs'));
    } catch {}
  });
  return result;
};

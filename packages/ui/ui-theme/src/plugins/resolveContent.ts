//
// Copyright 2023 DXOS.org
//

import { promisify } from 'node:util';

import Glob from 'glob';

const glob = promisify(Glob.glob);

// TODO(burdon): Comment.
const knownIndirectPeers = [
  '@dxos/devtools',
  '@dxos/react-*',
  '@dxos/react-ui-*',
  // TODO(thure): glob v7 runs out of memory if we do a `**` search, and this is (hopefully) the only L3 content package; find a better solution.
  '@dxos/react-ui-table/node_modules/@dxos/react-ui-searchlist',
  '@dxos/shell',
];

const knownDirectPeers = ['@dxos/plugin-*', ...knownIndirectPeers];

const packageNamePattern = /.*node_modules\/(.+?)$/;
const packageName = (path: string) => path.match(packageNamePattern)?.[1];

const flatten = (acc: string[], group: string[]) => [...acc, ...group];
const dedupe = (acc: Record<string, string>, path: string) => {
  const name = packageName(path);
  if (name && !acc[name]) {
    acc[name] = path;
  }

  return acc;
};

export const resolveKnownPeers = async (content: string[], cwd: string): Promise<string[]> => {
  const globOptions = { cwd, absolute: true };

  const directPeers = await Promise.all(knownDirectPeers.map((peer) => glob(`./node_modules/${peer}`, globOptions)));

  // NOTE(thure): With glob v7, JS runs out of memory if `**` is used, so this limits the search to @dxos/plugin-*/node_modules
  const indirectPeers = await Promise.all(
    knownIndirectPeers.map((peer) => glob(`./node_modules/@dxos/plugin-*/node_modules/${peer}`, globOptions)),
  );

  const knownPeerContent = Object.values(
    indirectPeers.reduce(flatten, []).reduce(dedupe, directPeers.reduce(flatten, []).reduce(dedupe, {})),
  ).map((value) => `${value}/dist/lib/**/*.mjs`);

  return [...content, ...knownPeerContent];
};

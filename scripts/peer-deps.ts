#!/usr/bin/env pnpm --silent vite-node

//
// Copyright 2024 DXOS.org
//

import fs from 'fs';
import path from 'path';

interface PackageJSON {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const appPackagePath = path.resolve(__dirname, '../packages/apps/composer-app/package.json');
const packagesDir = path.resolve(__dirname, '../packages');

const findPackageJsonDirs = (dir: string): string[] => {
  const result: string[] = [];

  const files = fs.readdirSync(dir);
  if (files.includes('package.json')) {
    result.push(dir);
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory() && file !== 'node_modules') {
      result.push(...findPackageJsonDirs(filePath));
    }
  });

  return result;
};

const main = () => {
  // TODO(burdon): Compare plugin dependencies with base app package.
  // TODO(burdon): Whitelist critical deps (e.g., react).
  const { dependencies } = JSON.parse(fs.readFileSync(appPackagePath, 'utf-8')) as PackageJSON;
  // eslint-disable-next-line no-console
  console.log(dependencies);
  const packageJsonDirs = findPackageJsonDirs(packagesDir);
  // eslint-disable-next-line no-console
  console.log(packageJsonDirs);
};

main();

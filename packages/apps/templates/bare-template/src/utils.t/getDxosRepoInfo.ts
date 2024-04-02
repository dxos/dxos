//
// Copyright 2023 DXOS.org
//

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// TODO: factor out to own fs package like @dxos/fs
export const exists = async (...args: string[]): Promise<boolean> => {
  try {
    const result = await fs.stat(path.join(...args));
    return !!result;
  } catch (err: any) {
    if (/ENOENT/.test(err.message)) {
      return false;
    } else {
      throw err;
    }
  }
};

export const isDxosMonorepoSync = () => {
  try {
    const gitRemoteResult = execSync('git remote --v', { stdio: 'pipe' }).toString();
    const isDxosMonorepo = /:dxos\//.test(gitRemoteResult);
    const isMonitor = process.cwd().endsWith('monitor');
    return isDxosMonorepo && !isMonitor;
  } catch {
    return false;
  }
};

export const getTsConfig = async (rootDir: string) => {
  const content = await fs.readFile(path.resolve(rootDir, 'tsconfig.json'), 'utf-8');
  return JSON.parse(content);
};

const tryReadPackageJson = async (dir: string): Promise<object | undefined> => {
  const fileName = path.resolve(dir, 'package.json');
  if (!(await exists(fileName))) {
    return;
  }
  try {
    const contents = JSON.parse(await fs.readFile(fileName, 'utf-8'));
    if (contents?.name !== '@dxos/dxos') {
      return;
    }
    return contents;
  } catch (err) {}
};

export const getDxosRepoInfo = async () => {
  let dxosPackage: any | undefined;
  let dir = __dirname;
  console.log('getDxosRepoInfo');
  console.log(dir);
  while (!!dir && dir !== '/' && !(dxosPackage = await tryReadPackageJson(dir))) {
    dir = path.resolve(dir, '..');
    console.log(dir);
  }
  if (!dxosPackage) {
    return { isDxosMonorepo: false as const };
  }
  const findVitePatch = (patchedDependencies: any) => {
    for (const key in patchedDependencies) {
      if (/^vite/.test(key)) {
        return { [key]: patchedDependencies[key] };
      }
    }
    return {};
  };
  return {
    isDxosMonorepo: true as const,
    repositoryRootPath: dir,
    version: dxosPackage.version,
    patchedDependencies: findVitePatch(dxosPackage.pnpm.patchedDependencies),
  };
};

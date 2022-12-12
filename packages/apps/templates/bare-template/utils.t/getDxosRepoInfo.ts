import path from 'path';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { exists } from '@dxos/plate';

export const isDxosMonorepoSync = () => {
  const gitRemoteResult = execSync(`git remote --v`).toString();
  const isDxosMonorepo = /\:dxos\//.test(gitRemoteResult);
  return isDxosMonorepo;
};

export const getTsConfig = async (rootDir: string) => {
  const content = await fs.readFile(path.resolve(rootDir, 'tsconfig.json'), 'utf-8');
  return JSON.parse(content);
};

export const getDxosRepoInfo = async () => {
  const tryReadPackageJson = async (dir: string): Promise<object | undefined> => {
    const fileName = path.resolve(dir, 'package.json');
    if (!(await exists(fileName))) return;
    const contents = JSON.parse(await fs.readFile(fileName, 'utf-8'));
    if (contents?.name !== '@dxos/dxos') return;
    return contents;
  };
  let dxosPackage: any | undefined = undefined;
  let dir = __dirname;
  while (!!dir && dir !== '/' && !(dxosPackage = await tryReadPackageJson(dir))) {
    dir = path.resolve(dir, '..');
  }
  if (!dxosPackage) {
    return { isDxosMonorepo: false as false };
  }
  const findVitePatch = (patchedDependencies: any) => {
    for (let key in patchedDependencies) {
      if (/vite/.test(key)) {
        return { [key]: patchedDependencies[key] };
      }
    }
    return {};
  };
  return {
    isDxosMonorepo: true as true,
    repositoryRootPath: dir,
    version: dxosPackage.version,
    patchedDependencies: findVitePatch(dxosPackage.pnpm.patchedDependencies)
  };
};

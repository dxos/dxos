//
// Copyright 2021 DXOS.org
//

import * as fs from 'fs';
import { join } from 'path';
import { sync as pkgDir } from 'pkg-dir';

export class Project {
  static load (): Project {
    const packageRoot = pkgDir(process.cwd());
    if (!packageRoot) {
      throw new Error('Must be executed inside a package');
    }

    const packageJson = JSON.parse(fs.readFileSync(join(packageRoot, 'package.json'), 'utf-8'));

    return new Project(packageRoot, packageJson);
  }

  constructor (
    public readonly packageRoot: string,
    public readonly packageJsonContents: any
  ) {}

  get toolchainConfig (): ToolchainConfig {
    return this.packageJsonContents.toolchain ?? {};
  }
}

export interface ToolchainConfig {
  testingFramework?: 'mocha' | 'jest';
}

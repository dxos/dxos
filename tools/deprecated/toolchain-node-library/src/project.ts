//
// Copyright 2021 DXOS.org
//

import * as fs from 'fs';
import { join } from 'path';
import { sync as pkgDir } from 'pkg-dir';

import { Config } from './config.js';

export interface ToolchainConfig {
  bundlePackages?: string[]
  protoBase?: string
  forceCloseTests?: boolean
  testingFramework?: 'mocha' | 'jest'
  additionalTestSteps?: string[]
  jsdom?: boolean
}

export class Project {
  static load (config: Config): Project {
    const packageRoot = pkgDir(process.cwd());
    if (!packageRoot) {
      throw new Error('Must be executed inside a package.');
    }

    // Package config.
    const packageJson = JSON.parse(fs.readFileSync(join(packageRoot, 'package.json')).toString('utf-8'));

    // ESBuild config.
    let esbuildConfig;
    const configFile = join(packageRoot, config.esbuild.config);
    if (fs.existsSync(configFile)) {
      esbuildConfig = require(configFile);
    }

    return new Project(packageRoot, packageJson, esbuildConfig);
  }

  constructor (
    public readonly packageRoot: string,
    public readonly packageJsonContents: any,
    public readonly esbuildConfig?: any
  ) {}

  get entryPoint () {
    const { entryPoints } = this.esbuildConfig;
    if (entryPoints.length !== 1) {
      throw new Error('One entrypoint must be specified in the esbuild-server config.');
    }

    return entryPoints[0];
  }

  get toolchainConfig (): ToolchainConfig {
    return this.packageJsonContents.toolchain ?? {};
  }

  /**
   * Uses heuristics to determine if the project is a react package.
   */
  get isReactPackage (): boolean {
    return !!(this.packageJsonContents.dependencies?.react ??
      this.packageJsonContents.devDependencies?.react ??
      this.packageJsonContents.peerDependencies?.react);
  }
}

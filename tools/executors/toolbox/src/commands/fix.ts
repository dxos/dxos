//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import defaultsDeep from 'lodash.defaultsdeep';
import pick from 'lodash.pick';
import path from 'path';
import sortPackageJson from 'sort-package-json';

import { Command } from '../command';
import { loadJson, saveJson, sortJson } from '../util';

const tsConfigFixedKeys = ['extends', 'compilerOptions'];

const projectFixedKeys = ['sourceRoot', 'projectType', 'targets'];

/**
 * Clean-up package config files:
 * - `package.json`
 * - `project.json`
 * - `tsconfig.json`
 */
export class FixCommand extends Command {
  _packagePath?: string;
  _packageJson?: any;

  override async init() {
    this._packagePath = path.join(this.path, 'package.json');
    this._packageJson = await loadJson(this._packagePath);
    assert(this._packageJson);
    return true;
  }

  // TODO(burdon): Options.
  override async exec() {
    await this.fixPackage();
    await this.fixTsConfig();
    await this.fixProject();
    return true;
  }

  /**
   * Process `package.json` and patch common fields from the root.
   */
  async fixPackage() {
    const rootPackage = await loadJson(path.join(this.context.root, 'package.json'));
    const commonKeys = pick(rootPackage, this.config.config?.package?.common);
    const updated = sortPackageJson(defaultsDeep(this._packageJson, commonKeys));
    await saveJson(this._packagePath!, updated);
  }

  /**
   * Process `tsconfig.json` and update references.
   */
  async fixTsConfig() {
    const filepath = path.join(this.path, 'tsconfig.json');
    const tsConfigJson = await loadJson<any>(filepath);
    if (tsConfigJson) {
      // Get refs.
      const { dependencies = {}, devDependencies = {} } = this._packageJson;
      tsConfigJson.references = [...Object.entries(dependencies), ...Object.entries(devDependencies)]
        .map(([key, value]) => {
          if (value === 'workspace:*') {
            const project = this.workspace.getProject(key)!;
            const relative = path.relative(this.path, path.join(this.context.root, project.root));
            return { path: relative };
          }

          return undefined;
        })
        .filter(Boolean);

      const updated = sortJson(tsConfigJson, {
        depth: 3,
        map: {
          '.': tsConfigFixedKeys,
          '.references': (value: any) => value.path
        }
      });

      await saveJson(filepath, updated);
    }
  }

  /**
   * Process `project.json`.
   */
  async fixProject() {
    const filepath = path.join(this.path, 'project.json');
    const projectJson = await loadJson(filepath);
    if (projectJson) {
      const updated = sortJson(projectJson, {
        depth: -1,
        map: {
          '.': projectFixedKeys
        }
      });

      await saveJson(filepath, updated);
    }
  }
}

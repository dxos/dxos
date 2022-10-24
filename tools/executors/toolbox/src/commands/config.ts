//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import chalk from 'chalk';
import fs from 'fs';
import defaultsDeep from 'lodash.defaultsdeep';
import pick from 'lodash.pick';
import path from 'path';
import sortPackageJson from 'sort-package-json';

import { Command } from '../command';
import { loadJson, sortJson } from '../util';

// Fixed order fields.
const tsConfigFields = [
  'extends',
  'compilerOptions'
];

/**
 * Manage package config files.
 * - package.json
 * - project.json
 * - tsconfig.json
 */
export class ConfigCommand extends Command {
  _packageJson: any;

  async exec () {
    await this.fixPackage();
    await this.fixTsConfig();
  }

  override onInit () {
    this._packageJson = loadJson(path.join(this.path, 'package.json'));
    assert(this._packageJson);
  }

  /**
   * Sort `package.json` and patch common fields from the root.
   */
  async fixPackage () {
    const rootPackage = loadJson(path.join(this.context.root, 'package.json'));
    const commonValues = pick(rootPackage, this.config.config?.package?.common);

    const packagePath = path.join(this.path, 'package.json');
    const updatedJson = defaultsDeep(this._packageJson, commonValues);
    const sortedJson = sortPackageJson(JSON.stringify(updatedJson, undefined, 2));

    fs.writeFileSync(packagePath, sortedJson, 'utf-8');
    console.log(`Updated: ${chalk.green(packagePath)}`);
  }

  /**
   * Sort `tsconfig.json` and update references.
   */
  async fixTsConfig () {
    const filepath = path.join(this.path, 'tsconfig.json');
    const tsConfigJson = loadJson(filepath);
    if (tsConfigJson) {
      // Get refs.
      const { dependencies, devDependencies } = this._packageJson;
      tsConfigJson.references = ([...Object.entries(dependencies), ...Object.entries(devDependencies)]).map(([key, value]) => {
        if (value === 'workspace:*') {
          const project = this.workspace.getProject(key)!;
          const relative = path.relative(this.path, path.join(this.context.root, project.root));
          return { path: relative };
        }

        return undefined;
      }).filter(Boolean);

      const updated = sortJson(tsConfigJson, tsConfigFields);
      fs.writeFileSync(filepath, JSON.stringify(updated, undefined, 2), 'utf-8');
      console.log(`Updated: ${chalk.green(filepath)}`);
    }
  }
}

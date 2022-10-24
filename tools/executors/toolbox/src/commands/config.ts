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

/**
 * Manage package config files.
 * - package.json
 * - project.json
 * - tsconfig.json
 */
export class ConfigCommand extends Command {
  _commonValues: any;

  async exec () {
    await this.sortPackage();
  }

  override onInit () {
    const { root } = this.context;
    const packageFile = path.join(root, 'package.json');
    const packageJson = Command.loadJson(packageFile);
    this._commonValues = pick(packageJson, this.config.config?.package?.common);
  }

  /**
   * Sort `package.json` and patch common fields from the root.
   */
  async sortPackage () {
    const filepath = path.join(this.path, 'package.json');
    const packageJson = Command.loadJson(filepath);
    assert(packageJson);

    const updatedJson = defaultsDeep(packageJson, this._commonValues);
    const sorted = sortPackageJson(JSON.stringify(updatedJson, undefined, 2));

    fs.writeFileSync(filepath, sorted, 'utf-8');
    console.log(`Updated: ${chalk.green(filepath)}`);
  }
}

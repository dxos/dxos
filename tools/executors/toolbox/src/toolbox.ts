//
// Copyright 2022 DXOS.org
//

import defaultsdeep from 'lodash.defaultsdeep';
import { execSync } from 'child_process';
import { join, relative } from 'path';

import { loadJson, saveJson, sortJson } from './util';

type Project = {
  name: string;
  path: string;
  dependencies: Record<string, any>[];
  devDependencies: Record<string, any>[];
};

type ToolboxOptions = {
  verbose?: boolean;
  ignoredProjects?: string[];
  fixedProjectKeys?: string[];
};

const defaultOptions = {
  ignoredProjects: ['@dxos/dxos', '@dxos/docs', '@dxos/readme'],
  fixedProjectKeys: ['sourceRoot', 'projectType', 'targets']
};

class Toolbox {
  private readonly options: ToolboxOptions;
  private readonly rootDir: string;
  private readonly projects: Project[];

  // TODO(burdon): Merge options.
  constructor(options: ToolboxOptions = {}) {
    this.options = defaultsdeep({}, options, defaultOptions);
    this.rootDir = execSync('git rev-parse --show-toplevel').toString().trim();

    const buffer = execSync('pnpm ls -r --depth -1 --json').toString();
    this.projects = JSON.parse(buffer)
      .filter(
        (project: Project) =>
          project.name.startsWith('@dxos') &&
          (!this.options.ignoredProjects || this.options.ignoredProjects.indexOf(project.name) === -1)
      )
      .sort((a: Project, b: Project) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  info() {}

  async updateWorkspace() {
    const workspace = {
      version: 2,
      projects: Object.fromEntries(
        this.projects.map((project) => [project.name.slice('@dxos/'.length), relative(this.rootDir, project.path)])
      )
    };

    await saveJson(join(this.rootDir, 'workspace.json'), workspace, this.options.verbose);
  }

  async updateProjects() {
    for (const project of this.projects) {
      const filepath = join(project.path, 'project.json');
      const projectJson = await loadJson(filepath);
      if (projectJson) {
        const updated = sortJson(projectJson, {
          depth: -1,
          map: {
            '.': this.options.fixedProjectKeys!
          }
        });

        console.log(updated);
        return;
        // await saveJson(filepath, updated);
      }
    }
  }

  async updatePackages() {}

  async updateTsConfig() {}
}

/**
 * Hook runs on `pnpm i` (see root `package.json` script `postinstall`).
 */
const run = async () => {
  // TODO(burdon): Parse options.
  const toolbox = new Toolbox();
  await toolbox.updateWorkspace();
  await toolbox.updateProjects();
  await toolbox.updatePackages();
  await toolbox.updateTsConfig();
};

void run();

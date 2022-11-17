//
// Copyright 2022 DXOS.org
//

import { execSync } from 'child_process';
import defaultsDeep from 'lodash.defaultsdeep';
import pick from 'lodash.pick';
import { join, relative } from 'path';
import sortPackageJson from 'sort-package-json';

import { loadJson, saveJson, sortJson } from './util';

export type ToolboxConfig = {
  config?: {
    package: {
      common: string[];
    };
  };
};

type Project = {
  name: string;
  path: string;
  dependencies: Record<string, any>[];
  devDependencies: Record<string, any>[];
};

type Package = {};

type ToolboxOptions = {
  verbose?: boolean;
  ignoredProjects?: string[];
  fixedProjectKeys?: string[];
  tsConfigFixedKeys?: string[];
};

// TODO(burdon): Move to config file.
const defaultOptions = {
  ignoredProjects: ['@dxos/dxos', '@dxos/docs', '@dxos/readme'],
  fixedProjectKeys: ['sourceRoot', 'projectType', 'targets'],
  tsConfigFixedKeys: ['extends', 'compilerOptions']
};

class Toolbox {
  private readonly options: ToolboxOptions;
  private readonly rootDir: string;
  private readonly rootPackage: any;

  private config!: ToolboxConfig;
  private projects!: Project[];

  // TODO(burdon): Merge options.
  constructor(options: ToolboxOptions = {}) {
    this.options = defaultsDeep({}, options, defaultOptions);
    this.rootDir = execSync('git rev-parse --show-toplevel').toString().trim();
    this.rootPackage = loadJson(join(this.rootDir, 'package.json'));
  }

  /**
   * Initialize.
   * - Read config.
   * - Create package list.
   */
  async init() {
    const configPath = join(this.rootDir, 'toolbox.json');
    this.config = (await loadJson<ToolboxConfig>(configPath, false)) ?? {};

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

  /**
   * Update root workspace file.
   * - Sort
   */
  async updateWorkspace() {
    const workspace = {
      version: 2,
      projects: Object.fromEntries(
        this.projects.map((project) => [project.name.slice('@dxos/'.length), relative(this.rootDir, project.path)])
      )
    };

    await saveJson(join(this.rootDir, 'workspace.json'), workspace, this.options.verbose);
  }

  /**
   * Update project files.
   * - Sort keys.
   */
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

        await saveJson(filepath, updated, this.options.verbose);
      }
    }
  }

  /**
   * Update package files.
   * - Sort keys.
   */
  async updatePackages() {
    // TODO(burdon): Investigate util: https://github.com/JamieMason/syncpack
    for (const project of this.projects) {
      const projectPath = join(project.path, 'package.json');
      const projectPackage = await loadJson(projectPath);
      const commonKeys = pick(this.rootPackage, this.config.config?.package.common ?? []);
      const updated = sortPackageJson(defaultsDeep(projectPackage, commonKeys));
      console.error(JSON.stringify(updated, undefined, 2));
      console.log(projectPackage);
      await saveJson(projectPath, updated);
    }
  }

  /**
   * Update tsconfig files.
   * - Sort keys.
   * - Update references.
   */
  async updateTsConfig() {
    for (const project of this.projects) {
      const projectPath = join(project.path, 'package.json');
      const projectPackage = await loadJson(projectPath);
      const tsConfigPath = join(project.path, 'tsconfig.json');
      const tsConfigJson = await loadJson<any>(tsConfigPath, false);
      if (tsConfigJson) {
        // Get refs.
        const { dependencies = {}, devDependencies = {} } = projectPackage;
        tsConfigJson.references = [...Object.entries(dependencies), ...Object.entries(devDependencies)]
          .map(([key, value]) => {
            if (value === 'workspace:*') {
              const project = this.workspace.getProject(key)!;
              const relative = relative(this.path, join(this.context.root, project.root));
              return { path: relative };
            }

            return undefined;
          })
          .filter(Boolean);

        const updated = sortJson(tsConfigJson, {
          depth: 3,
          map: {
            '.': this.options.tsConfigFixedKeys!,
            '.references': (value: any) => value.path
          }
        });

        await saveJson(tsConfigPath, updated);
      }
      break;
    }
  }
}

/**
 * Hook runs on `pnpm i` (see root `package.json` script `postinstall`).
 */
const run = async () => {
  // TODO(burdon): Parse options.
  const toolbox = new Toolbox({ verbose: true });
  await toolbox.init();
  // await toolbox.updateWorkspace();
  // await toolbox.updateProjects();
  // await toolbox.updatePackages();
  await toolbox.updateTsConfig();
};

void run();

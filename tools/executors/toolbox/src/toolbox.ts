//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { execSync } from 'child_process';
import { Table } from 'console-table-printer';
import fs from 'fs';
import defaultsDeep from 'lodash.defaultsdeep';
import pick from 'lodash.pick';
import { join, relative } from 'path';
import sortPackageJson from 'sort-package-json';

import { loadJson, saveJson, sortJson } from './util';

const raise = (err: Error) => {
  throw err;
};

export type ToolboxConfig = {
  project?: {
    ignored?: string[];
    fixedKeys?: string[];
  };
  package?: {
    commonKeys: string[];
  };
  tsconfig?: {
    fixedKeys?: string[];
  };
};

type Project = {
  name: string;
  version: string;
  private: boolean;
  path: string;
};

type ProjectJson = {
  sourceRoot: string;
  projectType: string;
  targets: {
    [target: string]: {
      executor: string;
      options?: any;
      outputs?: string[];
    };
  };
};

type PackageJson = {
  name: string;
  version: string;
  private: boolean;
  dependencies: Record<string, string>[];
  devDependencies: Record<string, string>[];
};

type TsConfigJson = {
  extends: string;
  references: {
    path: string;
  }[];
};

type ToolboxOptions = {
  verbose?: boolean;
};

const defaultOptions = {
  verbose: false
};

class Toolbox {
  private readonly options: ToolboxOptions;
  private readonly rootDir: string;

  private config!: ToolboxConfig;
  private rootPackage!: PackageJson;
  private projects!: Project[];

  // TODO(burdon): Merge options.
  constructor(options: ToolboxOptions = {}) {
    this.options = defaultsDeep({}, options, defaultOptions);
    this.rootDir = execSync('git rev-parse --show-toplevel').toString().trim();
  }

  /**
   * Initialize.
   * - Read config.
   * - Create package list.
   */
  async init() {
    const configPath = join(this.rootDir, 'toolbox.json');
    this.config = await loadJson<ToolboxConfig>(configPath);
    console.log(`Config: ${configPath}`);

    // Get workspace package.
    this.rootPackage = await loadJson(join(this.rootDir, 'package.json'));

    // Load and sort projects.
    const projects: Project[] = JSON.parse(execSync('pnpm ls -r --depth -1 --json').toString());
    this.projects = projects.filter(
      (project: Project) =>
        project.name.startsWith('@dxos') &&
        (!this.config.project?.ignored || this.config.project?.ignored.indexOf(project.name) === -1)
    );

    this.projects.sort((a: Project, b: Project) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    // console.log('==', this.projects.length);
  }

  info() {
    const table = new Table({
      columns: [
        { name: 'package', alignment: 'left' },
        { name: 'path', alignment: 'left' }
      ]
    });

    // TODO(burdon): Sort by tools, packages.
    for (const project of this.projects) {
      table.addRow({
        package: chalk.green(project.name),
        path: chalk.blue(project.path)
      });
    }

    console.log(table.render());
  }

  /**
   * Update root workspace file.
   * - Sort
   */
  async updateWorkspace() {
    console.log('Updating workspace.json');
    const workspace = {
      version: 2,
      projects: Object.fromEntries(
        this.projects.map((project) => [project.name.slice('@dxos/'.length), relative(this.rootDir, project.path)])
      )
    };

    await saveJson(join(this.rootDir, 'workspace.json'), workspace, this.options.verbose);
  }

  /**
   * Update root package file.
   * - Sort
   */
  async updateRootPackage() {
    console.log('Updating package.json');
    const packagePath = join(this.rootDir, 'package.json');
    const packageJson = await loadJson<PackageJson>(packagePath);
    const updated = sortPackageJson(packageJson);
    await saveJson(packagePath, updated, this.options.verbose);
  }

  /**
   * Update project files.
   * - Sort keys.
   */
  async updateProjects() {
    console.log('Updating all project.json');
    for (const project of this.projects) {
      const projectPath = join(project.path, 'project.json');
      const projectJson = await loadJson<ProjectJson>(projectPath);
      if (projectJson?.targets) {
        if (projectJson.targets.build) {
          projectJson.targets.build.options.transformers = ['@dxos/log-hook/transformer'];
        }

        if (projectJson.targets.lint) {
          projectJson.targets.lint.options.format = 'unix';
        }

        const updated = sortJson(projectJson, {
          depth: -1,
          map: {
            '.': this.config.project?.fixedKeys ?? []
          }
        });

        await saveJson(projectPath, updated, this.options.verbose);
      }
    }
  }

  /**
   * Update package files.
   * - Sort keys.
   */
  async updatePackages() {
    console.log('Updating all package.json');
    for (const project of this.projects) {
      const packagePath = join(project.path, 'package.json');
      const packageJson = await loadJson<PackageJson>(packagePath);
      const commonKeys = pick(this.rootPackage, this.config.package?.commonKeys ?? []);
      // TODO(burdon): Investigate util: https://github.com/JamieMason/syncpack
      const updated = sortPackageJson(defaultsDeep(packageJson, commonKeys));
      await saveJson(packagePath, updated, this.options.verbose);
    }
  }

  /**
   * Update tsconfig files.
   * - Sort keys.
   * - Update references.
   */
  async updateTsConfig() {
    console.log('Updating all tsconfig.json');
    for (const project of this.projects) {
      const projectPath = join(project.path, 'package.json');
      const projectPackage = await loadJson<PackageJson>(projectPath);
      const tsConfigPath = join(project.path, 'tsconfig.json');
      if (fs.existsSync(tsConfigPath)) {
        const tsConfigJson = await loadJson<TsConfigJson>(tsConfigPath);

        // Get refs.
        const { dependencies = {}, devDependencies = {} } = projectPackage!;
        const deps = [...Object.entries(dependencies), ...Object.entries(devDependencies)].filter(
          ([_, value]) => value === 'workspace:*'
        );

        tsConfigJson.references = deps.map(([dependencyName]) => {
          const dependency = this._getProjectByPackageName(dependencyName)!;
          const path = relative(project.path, dependency.path);
          return { path };
        });

        const updated = sortJson(tsConfigJson, {
          depth: 3,
          map: {
            '.': this.config.tsconfig?.fixedKeys ?? [],
            '.references': (value: any) => value.path
          }
        });

        await saveJson(tsConfigPath, updated, this.options.verbose);
      }
    }
  }

  _getProjectByPackageName(name: string): Project {
    return this.projects.find((project) => project.name === name) ?? raise(new Error(`Package not found: ${name}`));
  }
}

/**
 * Hook runs on `pnpm i` (see root `package.json` script `postinstall`).
 */
const run = async () => {
  // TODO(burdon): Parse options using yargs.
  const toolbox = new Toolbox({ verbose: false });
  await toolbox.init();
  await toolbox.updateWorkspace();
  await toolbox.updateRootPackage();
  await toolbox.updateProjects();
  await toolbox.updatePackages();
  await toolbox.updateTsConfig();
};

void run();

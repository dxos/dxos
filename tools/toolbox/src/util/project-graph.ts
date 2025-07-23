//
// Copyright 2025 DXOS.org
//

import { execSync } from 'node:child_process';
import { join } from 'node:path';

import { loadJson } from './file';

export type Project = {
  name: string;
  version: string;
  private: boolean;
  path: string;
};

export type PackageJson = {
  name: string;
  version: string;
  type?: string;
  private: boolean;
  exports?: string | Record<string, string | Record<string, string | Record<string, string>>>;
  main?: string;
  browser?: Record<string, string>;
  types?: string;
  typesVersions?: Record<string, Record<string, string[]>>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
};

export class ProjectGraph {
  projects: Project[] = [];
  manifests: PackageJson[] = [];

  constructor(
    private readonly _rootDir: string,
    private readonly _ignoredProjects: string[] = [],
  ) {}

  get rootDir() {
    return this._rootDir;
  }

  async init(): Promise<void> {
    // TODO(dmaretskyi): Async.
    const projects: Project[] = JSON.parse(execSync('pnpm ls -r --depth -1 --json').toString());
    this.projects = projects.filter(
      (project: Project) =>
        (project.name?.startsWith('@dxos') || project.name?.startsWith('@braneframe')) &&
        (!this._ignoredProjects || this._ignoredProjects.indexOf(project.name) === -1),
    );
    this.projects.sort((a: Project, b: Project) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    this.manifests = await Promise.all(
      this.projects.map(async (project) => {
        const manifest = await loadJson<PackageJson>(join(project.path, 'package.json'));
        return manifest;
      }),
    );
  }

  hasPackage(name: string): boolean {
    return this.projects.some((project) => project.name === name);
  }

  getProject(name: string): Project | undefined {
    return this.projects.find((project) => project.name === name);
  }

  getManifest(name: string): PackageJson | undefined {
    return this.manifests.find((manifest) => manifest.name === name);
  }

  getWorkspaceDependencies(
    name: string,
    { deps = true, devDeps = true }: { deps?: boolean; devDeps?: boolean } = {},
  ): string[] {
    const manifest = this.getManifest(name);
    return Object.entries({
      ...(deps ? (manifest?.dependencies ?? {}) : {}),
      ...(devDeps ? (manifest?.devDependencies ?? {}) : {}),
    })
      .filter(([name, version]) => version.startsWith('workspace:') && this.hasPackage(name))
      .map(([name]) => name);
  }

  getTransitiveWorkspaceDeps(roots: string[]): string[] {
    // Start with the root dependencies
    const allDeps = new Set<string>(roots);

    // Keep collecting dependencies until we reach a fixed point
    let hasNewDeps = true;
    while (hasNewDeps) {
      const prevSize = allDeps.size;

      // Collect all workspace dependencies for current deps
      for (const dep of Array.from(allDeps)) {
        const workspaceDeps = this.getWorkspaceDependencies(dep);
        for (const transitiveDep of workspaceDeps) {
          allDeps.add(transitiveDep);
        }
      }

      // Check if we've found any new dependencies
      hasNewDeps = allDeps.size > prevSize;
    }

    return Array.from(allDeps);
  }
}

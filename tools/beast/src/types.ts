//
// Copyright 2022 DXOS.org
//

import {
  type ClassDeclarationStructure,
  type ImportDeclarationStructure,
  type PropertyDeclarationStructure,
  type SourceFile,
} from 'ts-morph';

//
// JSON files.
//

export type WorkspaceJson = {
  readonly baseDir: string;
  readonly projects: { [idx: string]: string };
};

/**
 * Project config in `package.json`.
 */
export type PackageConfig = {
  classDiagrams?: {
    root: string;
    dependencies?: string[];
    glob?: string;
  }[];
};

export type PackageJson = {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly dependencies: { [idx: string]: string };
  readonly beast?: PackageConfig;
};

//
// Graph nodes.
//

export type Project = {
  // Potential clash with ts-morph.
  readonly name: string;
  readonly subDir: string;
  readonly package: PackageJson; // TODO(burdon): Change to Package.
  readonly dependencies: Set<Project>;
  readonly descendents: Set<string>; // Includes modules that are not workspace projects.
  readonly cycles: string[][];
};

export type Package = {
  readonly project: Project;
  readonly package: PackageJson;
  readonly files: File[];
};

export type File = {
  readonly package: Package;
  readonly source: SourceFile;
  readonly imports: ImportDeclarationStructure[];
  readonly classes: ClassDeclarationStructure[];
};

// TODO(burdon): Track properties that own/construct/reference class objects.
export type Class = {
  readonly properties: Property[];
};

export type Property = {
  readonly struct: PropertyDeclarationStructure;
};

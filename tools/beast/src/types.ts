//
// Copyright 2022 DXOS.org
//

export type WorkspaceJson = {
  projects: {[idx: string]: string}
}

export type PackageJson = {
  name: string
  description: string
  version: string
  dependencies: {[idx: string]: string}
}

export type Project = {
  name: string
  subdir: string
  package: PackageJson
  dependencies: Set<Project>
  descendents?: Set<string>
  cycles?: string[][]
}

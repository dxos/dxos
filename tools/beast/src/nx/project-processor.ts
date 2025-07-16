//
// Copyright 2022 DXOS.org
//

import path from 'path';
import { type ClassDeclaration, Project } from 'ts-morph';

import { type WorkspaceProcessor } from '../nx';

/**
 * Process Nx project and package.
 */
export class ProjectProcessor {
  private readonly _project: Project;

  // prettier-ignore
  constructor(
    private readonly _workspace: WorkspaceProcessor,
    packageName: string,
  ) {
    const subDir = this._workspace.getProjectByPackage(packageName)?.subDir;
    const projectDir = path.join(this._workspace.baseDir, subDir!);

    // https://ts-morph.com/details/index
    this._project = new Project({
      // skipAddingFilesFromTsConfig: false,
      tsConfigFilePath: path.join(projectDir, 'tsconfig.json'),
    });
  }

  getClass(className: string): ClassDeclaration | undefined {
    // https://ts-morph.com/navigation/getting-source-files
    const files = this._project.getSourceFiles();
    const file = files.find((file) => file.getClass(className));
    return file?.getClass(className);
  }
}

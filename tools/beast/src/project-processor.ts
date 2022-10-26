//
// Copyright 2022 DXOS.org
//

import path from 'path';
import { ClassDeclaration, Project } from 'ts-morph';

import { ProjectMap } from './types';

/**
 * Process Nx project and package.
 */
export class ProjectProcessor {
  private readonly _project: Project;

  constructor(private readonly _baseDir: string, private readonly _projectMap: ProjectMap, packageName: string) {
    const subDir = this._projectMap.getProjectByPackage(packageName)?.subdir;
    const projectDir = path.join(this._baseDir, subDir!);

    // https://ts-morph.com/details/index
    this._project = new Project({
      // skipAddingFilesFromTsConfig: false,
      tsConfigFilePath: path.join(projectDir, 'tsconfig.json')
    });
  }

  getClass(className: string): ClassDeclaration | undefined {
    // https://ts-morph.com/navigation/getting-source-files
    const files = this._project.getSourceFiles();
    const file = files.find((file) => file.getClass(className));
    return file?.getClass(className);
  }
}

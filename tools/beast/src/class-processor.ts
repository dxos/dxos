//
// Copyright 2022 DXOS.org
//

import path from 'path';
import { ClassDeclaration, InterfaceDeclaration, Project } from 'ts-morph';

import { ProjectMap } from './types';

export class ClassProcessor {
  constructor (
    private readonly _baseDir: string,
    private readonly _projectMap: ProjectMap
  ) {}

  process (packageName: string, className: string) {
    const subDir = this._projectMap.getProjectByPackage(packageName)?.subdir!;
    const projectDir = path.join(this._baseDir, subDir);

    // https://ts-morph.com/navigation/getting-source-files
    const project = new Project({
      tsConfigFilePath: path.join(projectDir, 'tsconfig.json')
      // skipAddingFilesFromTsConfig: false
    });

    const files = project.getSourceFiles();
    const file = files.find(file => file.getClass(className));
    console.log('>>>', file);
  }
}



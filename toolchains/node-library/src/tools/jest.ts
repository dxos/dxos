//
// Copyright 2021 DXOS.org
//

import { join } from 'path';

import { TOOLCHAIN_PACKAGE_DIR } from '../common';
import { Project } from '../project';
import { execTool } from './common';

export function execJest (project: Project, additionalArgs: string[] = []) {
  const config = project.isReactPackage
    ? join(TOOLCHAIN_PACKAGE_DIR, 'jest.config.react.json')
    : join(TOOLCHAIN_PACKAGE_DIR, 'jest.config.json');
  execTool('jest', ['--config', config, '--passWithNoTests', '--rootDir', project.packageRoot, ...additionalArgs], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}

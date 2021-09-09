//
// Copyright 2021 DXOS.org
//

import { join } from 'path';

import { TOOLCHAIN_PACKAGE_DIR } from '../common';
import { Project } from '../project';
import { execTool } from './common';

export interface ExecJestOpts {
  project: Project,
  forceClose?: boolean,
  userArgs?: string[]
}

export function execJest ({ project, userArgs = [], forceClose }: ExecJestOpts) {
  const config = project.isReactPackage
    ? join(TOOLCHAIN_PACKAGE_DIR, 'jest.config.react.json')
    : join(TOOLCHAIN_PACKAGE_DIR, 'jest.config.json');
  execTool('jest', [
    '--config', config,
    '--passWithNoTests',
    '--rootDir', project.packageRoot,
    forceClose ? '--forceExit' : '',
    ...userArgs
  ], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}

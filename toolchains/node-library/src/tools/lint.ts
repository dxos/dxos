//
// Copyright 2021 DXOS.org
//

import { join } from 'path';

import { TOOLCHAIN_PACKAGE_DIR } from '../common';
import { Project } from '../project';
import { execTool } from './common';

export function execLint (project: Project, additionalArgs: string[] = []) {
  const config = project.isReactPackage
    ? join(TOOLCHAIN_PACKAGE_DIR, '.eslintrc.react.js')
    : join(TOOLCHAIN_PACKAGE_DIR, '.eslintrc.js');
  execTool('eslint', ['--config', config, '{src,test,browser-test,stories,playwright}/**/*.{js,ts,jsx,tsx}', ...additionalArgs]);
}

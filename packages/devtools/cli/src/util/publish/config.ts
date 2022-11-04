//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import fs from 'fs';
import yaml from 'js-yaml';
import defaultsDeep from 'lodash.defaultsdeep';
import path from 'path';

import { Config } from '@dxos/config';
import type { ConfigProto } from '@dxos/config';

import { PackageModule } from './common';

const DEFAULT_BUILD_COMMAND = 'npm run build';
const EXTENSION_CONFIG_FILENAME = 'dx.yml';

export const loadConfig = async (configPath: string = EXTENSION_CONFIG_FILENAME): Promise<Config> => {
  const absolute = path.isAbsolute(configPath);
  configPath = absolute ? configPath : path.join(process.cwd(), configPath);

  assert(fs.existsSync(configPath), `"${configPath}" not found.`);

  const dxConfig = yaml.load(String(fs.readFileSync(configPath))) as ConfigProto;

  assert(dxConfig.package?.modules?.length, `No modules found in ${configPath}`);

  return new Config({
    version: 1,
    package: {
      modules: dxConfig.package.modules.map((module: PackageModule) =>
        defaultsDeep(module, {
          build: { command: DEFAULT_BUILD_COMMAND }
        })
      )
    }
  });
};

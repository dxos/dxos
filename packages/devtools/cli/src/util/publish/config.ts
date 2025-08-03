//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import path from 'path';

import yaml from 'js-yaml';
import defaultsDeep from 'lodash.defaultsdeep';

import { Config } from '@dxos/config';
import type { ConfigProto } from '@dxos/config';
import { invariant } from '@dxos/invariant';

import { type PackageModule } from './common';

const DEFAULT_BUILD_COMMAND = 'npm run build';
const EXTENSION_CONFIG_FILENAME = 'dx.yml';

export const loadConfig = async (configPath: string = EXTENSION_CONFIG_FILENAME): Promise<Config> => {
  const absolute = path.isAbsolute(configPath);
  configPath = absolute ? configPath : path.join(process.cwd(), configPath);

  invariant(fs.existsSync(configPath), `"${configPath}" not found.`);

  const dxConfig = yaml.load(String(fs.readFileSync(configPath))) as ConfigProto;

  invariant(dxConfig.package?.modules?.length, `No modules found in ${configPath}`);

  return new Config({
    version: 1,
    package: {
      modules: dxConfig.package.modules.map((module: PackageModule) =>
        defaultsDeep(module, {
          build: { command: DEFAULT_BUILD_COMMAND },
        }),
      ),
    },
  });
};

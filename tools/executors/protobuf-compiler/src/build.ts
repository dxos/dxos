//
// Copyright 2022 DXOS.org
//

import { resolve } from 'path';

import { preconfigureProtobufjs } from './configure';
import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { registerResolver } from './parser';
import { parseAndGenerateSchema } from './type-generator';

export const build = async ({
  proto,
  substitutions,
  baseDir,
  outDir,
  verbose = false,
  packageExports
}: {
  proto: string[];
  substitutions?: string;
  baseDir: string | undefined;
  outDir: string;
  verbose: boolean;
  packageExports?: boolean;
}) => {
  
};

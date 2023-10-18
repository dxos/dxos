//
// Copyright 2021 DXOS.org
//

import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

import { type Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';

import { mapFromKeyValues } from '../config';
import { FILE_DEFAULTS, FILE_ENVS } from '../types';

// TODO(burdon): Move code out of index file.

const DEFAULT_BASE_PATH = path.resolve(process.cwd(), 'config');

const maybeLoadFile = (file: string): any => {
  try {
    return yaml.load(fs.readFileSync(file, { encoding: 'utf8' }));
  } catch (err: any) {
    // Ignored.
  }
};

//
// NOTE: Export LocalStorage and Dynamics for typescript to typecheck browser code (see ConfigPlugin).
//

/**
 * Development config.
 */
export const Local = (): Partial<ConfigProto> => ({});

/**
 * Provided dynamically by server.
 */
export const Dynamics = (): Partial<ConfigProto> => ({});

/**
 * ENV variable (key/value) map.
 */
export const Envs = (basePath = DEFAULT_BASE_PATH): Partial<ConfigProto> => {
  const content = maybeLoadFile(path.resolve(basePath, FILE_ENVS));
  return content ? mapFromKeyValues(content, process.env) : {};
};

/**
 * JSON config.
 */
export const Defaults = (basePath = DEFAULT_BASE_PATH): Partial<ConfigProto> =>
  maybeLoadFile(path.resolve(basePath, FILE_DEFAULTS)) ?? {};

//
// Copyright 2021 DXOS.org
//

import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

import { log } from '@dxos/log';
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
 * Profile
 */
export const Profile = (profile = 'default') => {
  const configFile = path.join(process.env.HOME ?? '~', `.config/dx/profile/${profile}.yml`);
  return maybeLoadFile(configFile) as ConfigProto;
};

/**
 * Development config.
 */
// TODO(burdon): Rename or reconcile with Profile above?
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

/**
 * Load config from storage.
 */
export const Storage = async (): Promise<Partial<ConfigProto>> => ({});

export const Remote = (target: string | undefined, authenticationToken?: string): Partial<ConfigProto> => {
  if (!target) {
    return {};
  }

  try {
    const url = new URL(target);
    const protocol = url.protocol.slice(0, -1);

    return {
      runtime: {
        client: {
          // TODO(burdon): Remove vault.html.
          remoteSource: url.origin + (protocol.startsWith('http') ? '/vault.html' : ''),
          remoteSourceAuthenticationToken: authenticationToken,
        },
      },
    };
  } catch (err) {
    log.catch(err);
    return {};
  }
};

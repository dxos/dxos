//
// Copyright 2021 DXOS.org
//

import { fromJson } from '@bufbuild/protobuf';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

import { log } from '@dxos/log';
import { InvalidConfigError } from '@dxos/protocols';
import { ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';

import { mapFromKeyValues } from '../config';
import { type ConfigInit, FILE_DEFAULTS, FILE_ENVS } from '../types';

// TODO(burdon): Move code out of index file.

const DEFAULT_BASE_PATH = path.resolve(process.cwd(), 'config');

const maybeLoadFile = (file: string): any => {
  try {
    return parse(fs.readFileSync(file, { encoding: 'utf8' }));
  } catch (err: any) {
    // Ignored.
  }
};

/**
 * Loads a config file, validating it against the schema.
 * This is the boundary where untrusted YAML enters, so field types are checked here rather than in
 * `validateConfig`, which the compiler already covers via `ConfigInit`.
 */
const maybeLoadConfigFile = (file: string): ConfigInit | undefined => {
  const content = maybeLoadFile(file);
  if (content === undefined || content === null) {
    return undefined;
  }

  try {
    // Unknown fields are ignored, matching the protobuf.js `verify` this replaced.
    return fromJson(ConfigSchema, content, { ignoreUnknownFields: true });
  } catch (err) {
    throw new InvalidConfigError({ message: `Invalid config in ${file}: ${err}` });
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
  return maybeLoadConfigFile(configFile);
};

/**
 * Development config.
 */
// TODO(burdon): Rename or reconcile with Profile above?
export const Local = (): ConfigInit => ({});

/**
 * Provided dynamically by server.
 */
export const Dynamics = (): ConfigInit => ({});

/**
 * ENV variable (key/value) map.
 */
export const Envs = (basePath = DEFAULT_BASE_PATH): ConfigInit => {
  const content = maybeLoadFile(path.resolve(basePath, FILE_ENVS));
  return content ? mapFromKeyValues(content, process.env) : {};
};

/**
 * JSON config.
 */
export const Defaults = (basePath = DEFAULT_BASE_PATH): ConfigInit =>
  maybeLoadConfigFile(path.resolve(basePath, FILE_DEFAULTS)) ?? {};

/**
 * Load config from storage.
 */
export const Storage = async (): Promise<ConfigInit> => ({});

export const Remote = (target: string | undefined, authenticationToken?: string): ConfigInit => {
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

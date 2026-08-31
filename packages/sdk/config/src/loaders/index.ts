//
// Copyright 2021 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

import { log } from '@dxos/log';
import { InvalidConfigError } from '@dxos/protocols';

import { mapFromKeyValues, parseConfig } from '../config';
import { type ConfigInit, FILE_DEFAULTS, FILE_ENVS } from '../types';

// TODO(burdon): Move code out of index file.

const DEFAULT_BASE_PATH = path.resolve(process.cwd(), 'config');

// An absent file is a normal outcome; anything else means the file exists but could not be read or
// parsed, which is surfaced rather than silently dropping the config it was meant to supply.
const maybeLoadFile = (file: string): any => {
  let content: string;
  try {
    content = fs.readFileSync(file, { encoding: 'utf8' });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return undefined;
    }
    throw new InvalidConfigError({ message: `Cannot read ${file}: ${err}` });
  }

  try {
    return parse(content);
  } catch (err: any) {
    throw new InvalidConfigError({ message: `Cannot parse ${file}: ${err}` });
  }
};

/** Validates as it loads, since this is where untrusted YAML enters. */
const maybeLoadConfigFile = (file: string): ConfigInit | undefined => {
  const content = maybeLoadFile(file);
  return content === undefined || content === null ? undefined : parseConfig(content, file);
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
  // `envs-map.yml` is a key/path spec rather than a config, so only its projection is validated.
  const content = maybeLoadFile(path.resolve(basePath, FILE_ENVS));
  if (!content) {
    return {};
  }

  let projected: unknown;
  try {
    projected = mapFromKeyValues(content, process.env);
  } catch (err) {
    // A `type: json` entry holding malformed JSON throws before the schema is ever consulted.
    throw new InvalidConfigError({ message: `Invalid config from ${FILE_ENVS}: ${err}` });
  }

  return parseConfig(projected, FILE_ENVS);
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

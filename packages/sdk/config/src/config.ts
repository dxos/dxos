//
// Copyright 2021 DXOS.org
//

import { create, fromJsonString } from '@bufbuild/protobuf';
import defaultsDeep from 'lodash.defaultsdeep';
import isMatch from 'lodash.ismatch';

import { InvalidConfigError } from '@dxos/protocols';
import { type Config as ConfigProto, ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { getDeep, setDeep } from '@dxos/util';

import { type ConfigInit, type ConfigKey, type DeepIndex, type ParseKey } from './types.ts';

type MappingSpec = Record<string, { path: string; type?: string }>;

/**
 * Maps the given objects onto a flattened set of (key x values).
 * Expects parsed yaml content of the form:
 *
 * ```
 * ENV_VAR:
 *   path: config.selector.path
 * ```
 *
 * @param {object} spec
 * @param {object} values
 * @return {object}
 */
export const mapFromKeyValues = (spec: MappingSpec, values: Record<string, any>) => {
  const config = {};

  for (const [key, { path, type }] of Object.entries(spec)) {
    let value = values[key];
    if (value !== undefined) {
      if (type) {
        switch (type) {
          case 'boolean': {
            value = String(value).toLowerCase() === 'true' || value === '1';
            break;
          }

          case 'number': {
            value = Number(value);
            break;
          }

          case 'string': {
            break;
          }

          case 'json': {
            value = value ? JSON.parse(value) : null;
            break;
          }

          default: {
            throw new Error(`Invalid type: ${type}`);
          }
        }
      }

      setDeep(config, path.split('.'), value);
    }
  }

  return config;
};

/**
 * Maps the given flattend set of (key x values) onto a JSON object.
 * @param {object} spec
 * @param {object} values
 */
export const mapToKeyValues = (spec: MappingSpec, values: any) => {
  const config: Record<string, any> = {};

  for (const [key, { path, type }] of Object.entries(spec)) {
    const value = getDeep(values, path.split('.'));
    if (value !== undefined) {
      switch (type) {
        case 'json':
          config[key] = JSON.stringify(value);
          break;
        default:
          config[key] = value;
      }
    }
  }

  return config;
};

/**
 * Validates a config object and normalises it into a buf message.
 * Field types are checked by the compiler through `ConfigInit`, which is why this no longer runs the
 * protobuf.js `verify` pass; loaders that read untrusted YAML validate as they parse.
 */
export const validateConfig = (config: ConfigInit): ConfigProto => {
  if (!('version' in config)) {
    throw new InvalidConfigError({ message: 'Version not specified' });
  }

  if (config?.version !== 1) {
    throw new InvalidConfigError({ message: `Invalid config version: ${config.version}` });
  }

  try {
    return create(ConfigSchema, config);
  } catch (err) {
    throw new InvalidConfigError({ message: String(err) });
  }
};

/** Keeps non-string `Struct` values out of string-only consumers of `runtime.app.env`. */
export const getEnvString = (config: Config | undefined, key: string): string | undefined => {
  const value = config?.values.runtime?.app?.env?.[key];
  return typeof value === 'string' ? value : undefined;
};

/** Validates config data from an untrusted source -- a file, an endpoint, browser storage. */
export const parseConfig = (data: unknown, source: string): ConfigInit => {
  try {
    // Serialising through JSON reaches `fromJsonString` without casting to `JsonValue`.
    return fromJsonString(ConfigSchema, JSON.stringify(data), { ignoreUnknownFields: true });
  } catch (err) {
    throw new InvalidConfigError({ message: `Invalid config from ${source}: ${err}` });
  }
};

/**
 * Global configuration object.
 * NOTE: Config objects are immutable.
 */
export class Config {
  private readonly _config: ConfigProto;

  /**
   * Creates an immutable instance.
   * @constructor
   */
  constructor(config: ConfigInit = {}, ...objects: ConfigInit[]) {
    this._config = validateConfig(defaultsDeep(config, ...objects, { version: 1 }));
  }

  /**
   * Returns an immutable config JSON object.
   */
  get values(): ConfigProto {
    return this._config;
  }

  /**
   * Returns the given config property.
   *
   * @param key A key in the config object. Can be a nested property with keys separated by dots: 'services.signal.server'.
   * @param defaultValue Default value to return if option is not present in the config.
   * @returns The config value or undefined if the option is not present.
   */
  get<K extends ConfigKey>(
    key: K,
    defaultValue?: DeepIndex<ConfigProto, ParseKey<K>>,
  ): DeepIndex<ConfigProto, ParseKey<K>> | undefined {
    return getDeep(this._config, key.split('.')) ?? defaultValue;
  }

  /**
   * Get unique key.
   */
  find<T = any>(path: string, test: object): T | undefined {
    const values = getDeep(this._config, path.split('.'));
    if (!Array.isArray(values)) {
      return;
    }

    return values.find((value) => isMatch(value, test));
  }

  /**
   * Returns the given config property or throw if it doesn't exist.
   *
   * @param key A key in the config object. Can be a nested property with keys separated by dots: 'services.signal.server'.
   */
  getOrThrow<K extends ConfigKey>(key: K): NonNullable<DeepIndex<ConfigProto, ParseKey<K>>> {
    const value: DeepIndex<ConfigProto, ParseKey<K>> | undefined = getDeep(this._config, key.split('.'));
    if (!value) {
      throw new Error(`Config option not present: ${key}`);
    }
    return value;
  }
}

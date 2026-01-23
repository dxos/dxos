//
// Copyright 2021 DXOS.org
//

import { boolean } from 'boolean';
import defaultsDeep from 'lodash.defaultsdeep';
import isMatch from 'lodash.ismatch';

import { InvalidConfigError } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { type Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';
import { trace } from '@dxos/tracing';
import { getDeep, setDeep } from '@dxos/util';

import { type ConfigKey, type DeepIndex, type ParseKey } from './types';

type MappingSpec = Record<string, { path: string; type?: string }>;
const configRootType = schema.getCodecForType('dxos.config.Config');

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
            value = boolean(value);
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
 * Validate config object.
 */
export const validateConfig = (config: ConfigProto): ConfigProto => {
  if (!('version' in config)) {
    throw new InvalidConfigError({ message: 'Version not specified' });
  }

  if (config?.version !== 1) {
    throw new InvalidConfigError({ message: `Invalid config version: ${config.version}` });
  }

  const error = configRootType.protoType.verify(config);
  if (error) {
    throw new InvalidConfigError({ message: String(error) });
  }

  return config;
};

export const ConfigResource = Symbol.for('dxos.resource.Config');

/**
 * Global configuration object.
 * NOTE: Config objects are immutable.
 */
@trace.resource({ annotation: ConfigResource })
export class Config {
  private readonly _config: any;

  /**
   * Creates an immutable instance.
   * @constructor
   */
  constructor(config: ConfigProto = {}, ...objects: ConfigProto[]) {
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
  getOrThrow<K extends ConfigKey>(key: K): Exclude<DeepIndex<ConfigProto, ParseKey<K>>, undefined> {
    const value: DeepIndex<ConfigProto, ParseKey<K>> | undefined = getDeep(this._config, key.split('.'));
    if (!value) {
      throw new Error(`Config option not present: ${key}`);
    }
    return value;
  }
}

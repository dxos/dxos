//
// Copyright 2021 DXOS.org
//

import { boolean } from 'boolean';
import defaultsDeep from 'lodash.defaultsdeep';
import get from 'lodash.get';
import set from 'lodash.set';

import { Config as ConfigType } from '@dxos/protocols/proto/dxos/config';

import { sanitizeConfig } from './sanitizer';
import { ConfigKey, DeepIndex, ParseKey } from './types';

type MappingSpec = Record<string, { path: string, type?: string }>;

/**
 * Maps the given objects onto a flattened set of (key x values).
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

      set(config, path, value);
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
    const value = get(values, path);
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
 * Global configuration object.
 * NOTE: Config objects are immutable.
 */
export class Config {
  private readonly _config: any;

  /**
   * Creates an immutable instance.
   * @constructor
   * @param objects
   */
  constructor (...objects: [ConfigType, ...ConfigType[]]) {
    this._config = sanitizeConfig(defaultsDeep(...objects, { version: 1 }));
  }

  /**
   * Returns an immutable config JSON object.
   */
  get values (): ConfigType {
    return this._config;
  }

  /**
   * Returns the given config property.
   *
   * @param key A key in the config object. Can be a nested property with keys separated by dots: 'services.signal.server'.
   * @param defaultValue Default value to return if option is not present in the config.
   * @returns The config value or undefined if the option is not present.
   */
  get <K extends ConfigKey> (key: K, defaultValue?: DeepIndex<ConfigType, ParseKey<K>>): DeepIndex<ConfigType, ParseKey<K>> {
    return get(this._config, key, defaultValue);
  }

  /**
   * Returns config key without type checking.
   *
   * @deprecated Use the type-checked version.
   */
  getUnchecked<T> (key: string, defaultValue?: T): T {
    return get(this._config, key, defaultValue);
  }

  /**
   * Returns the given config property or throw if it doesn't exist.
   *
   * @param key A key in the config object. Can be a nested property with keys separated by dots: 'services.signal.server'.
   */
  getOrThrow <K extends ConfigKey> (key: K): Exclude<DeepIndex<ConfigType, ParseKey<K>>, undefined> {
    const value = get(this._config, key);
    if (!value) {
      throw new Error(`Config option not present: ${key}`);
    }
    return value;
  }
}

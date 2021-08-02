//
// Copyright 2021 DXOS.org
//

import { boolean } from 'boolean';
import defaultsDeep from 'lodash.defaultsdeep';
import get from 'lodash.get';
import set from 'lodash.set';

import { validateConfig } from './schema-validator';
import { ConfigSchema } from './types';

type MappingSpec = Record<string, { path: string, type?: string }>;

/**
 * Maps the given objects onto a flattened set of (key x values).
 * @param {object} spec
 * @param {object} values
 * @return {object}
 */
export function mapFromKeyValues (spec: MappingSpec, values: Record<string, any>) {
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
}

/**
 * Maps the given flattend set of (key x values) onto a JSON object.
 * @param {object} spec
 * @param {object} values
 */
export function mapToKeyValues (spec: MappingSpec, values: any) {
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
}

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
  constructor (...objects: [any, ...any]) {
    this._config = defaultsDeep(...objects);

    validateConfig(this._config);
  }

  /**
   * Returns an immutable config JSON object.
   */
  get values (): ConfigSchema {
    return this._config;
  }

  /**
   * Returns the given config property.
   */
  get <T> (key: string, defaultValue?: T): T {
    return get(this._config, key, defaultValue);
  }
}

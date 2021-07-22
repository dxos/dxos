//
// Copyright 2021 DXOS.org
//

import { boolean } from 'boolean';
import defaultsDeep from 'lodash.defaultsdeep';
import get from 'lodash.get';
import set from 'lodash.set';

/**
 * Maps the given objects onto a flattened set of (key x values).
 * @param {object} spec
 * @param {object} values
 * @return {object}
 */
export function mapFromKeyValues (spec, values) {
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
export function mapToKeyValues (spec, values) {
  const config = {};

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
  /**
   * Creates an immutable instance.
   * @constructor
   * @param objects
   */
  constructor (...objects) {
    this._config = defaultsDeep(...objects);
  }

  /**
   * Returns an immutable config JSON object.
   * @return {object}
   */
  get values () {
    return this._config;
  }

  /**
   * Returns the given config property.
   * @param {string} key
   * @param {any} [defaultValue]
   */
  get (key, defaultValue) {
    return get(this._config, key, defaultValue);
  }
}

//
// Copyright 2020 DXOS.org
//

import { inspect } from 'node:util';

import { PublicKey } from '@dxos/keys';

import { humanize } from './human-hash';
import { arrayToBuffer } from './uint8array';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const MAX_DEPTH = 5;
const LOG_MAX_DEPTH = 7;

/**
 * JSON.stringify replacer.
 */
export function jsonReplacer(this: any, key: string, value: any): any {
  // TODO(burdon): Why is this represented as `{ type: 'Buffer', data }`.
  if (value !== null && typeof value === 'object' && typeof value[inspect.custom] === 'function') {
    return value[inspect.custom]();
  }

  if (value !== null && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
    if (value.data.length === 32) {
      const key = Buffer.from(value.data);
      return `[${humanize(key)}]:[${PublicKey.stringify(key)}]`;
    } else {
      return Buffer.from(value.data).toString('hex');
    }
  }

  // TODO(burdon): Option.
  // code if (Array.isArray(value)) {
  // code   return value.length;
  // code } else {
  return value;
  // code }
}

/**
 * Recursively converts an object into a JSON-compatible object.
 */
export const jsonify = (value: any, depth = 0, visitedObjects = new WeakSet<any>()): any => {
  if (depth > MAX_DEPTH) {
    return null;
  } else if (typeof value === 'function') {
    return null;
  } else if (typeof value === 'object' && value !== null) {
    if (visitedObjects.has(value)) {
      return null;
    }
    visitedObjects.add(value);

    try {
      if (value instanceof Uint8Array) {
        return arrayToBuffer(value).toString('hex');
      } else if (Array.isArray(value)) {
        return value.map((x) => jsonify(x, depth + 1, visitedObjects));
      } else if (typeof value.toJSON === 'function') {
        return value.toJSON();
      } else {
        const res: any = {};
        for (const key of Object.keys(value)) {
          res[key] = jsonify(value[key], depth + 1, visitedObjects);
        }
        return res;
      }
    } finally {
      visitedObjects.delete(value);
    }
  } else {
    return value;
  }
};

/**
 * Recursively converts an object into a JSON-compatible object appropriate for logging.
 */

// TODO(nf): use util.inspect/[util.inspect.custom] instead?
export const jsonlogify = (value: any, depth = 0, visitedObjects = new WeakSet<any>()): any => {
  if (depth > LOG_MAX_DEPTH) {
    return null;
  } else if (typeof value === 'function') {
    return null;
  } else if (typeof value === 'object' && value !== null) {
    if (visitedObjects.has(value)) {
      return null;
    }
    visitedObjects.add(value);

    try {
      if (value instanceof Uint8Array) {
        return arrayToBuffer(value).toString('hex');
      } else if (Array.isArray(value)) {
        return value.map((x) => jsonlogify(x, depth + 1, visitedObjects));
      } else if (typeof value.toJSONL === 'function') {
        return value.toJSONL();
      } else if (typeof value.toJSON === 'function') {
        return value.toJSON();
      } else {
        const res: any = {};
        for (const key of Object.keys(value)) {
          res[key] = jsonlogify(value[key], depth + 1, visitedObjects);
        }
        return res;
      }
    } finally {
      visitedObjects.delete(value);
    }
  } else {
    return value;
  }
};

export type JsonKeyOptions = {
  truncate?: boolean;
  humanize?: boolean;
};

export const jsonKeyReplacer =
  (options: JsonKeyOptions = {}) =>
  (key: string, value: any) => {
    if (typeof value === 'string') {
      const key = PublicKey.fromHex(value);
      if (key.toHex() === value) {
        // TODO(burdon): Remove humanize.
        return options.humanize ? humanize(key) : options.truncate ? key.truncate() : key.toHex();
      }
    }

    return value;
  };

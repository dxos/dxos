//
// Copyright 2020 DxOS.org
//

import assert from 'assert';

/**
 * @typedef {Object} Value
 * @typedef {{ key:string, value:Value }} KeyValue
 * @typedef {Object} ObjectMutation
 * @typedef {Object} ObjectMutationSet
 */

const TYPE = {
  NULL: 'null',

  BOOLEAN: 'bool',
  INTEGER: 'int',
  FLOAT: 'float',
  STRING: 'string',

  BYTES: 'bytes',
  TIMESTAMP: 'timestamp',
  DATETIME: 'datetime',

  OBJECT: 'object'
};

const SCALAR_TYPES = [
  TYPE.BOOLEAN,
  TYPE.INTEGER,
  TYPE.FLOAT,
  TYPE.STRING,
  TYPE.BYTES,
  TYPE.TIMESTAMP,
  TYPE.DATETIME
];

/**
 * Represents a named property value.
 */
export class KeyValueUtil {
  static createMessage (key, value) {
    assert(key);

    return {
      key,
      // eslint-disable-next-line no-use-before-define
      value: ValueUtil.createMessage(value)
    };
  }
}

/**
 * Represents scalar, array, and hierarchical values.
 * { null, boolean, number, string }
 */
export class ValueUtil {
  /**
   * @param {any} value
   * @return {{Value}}
   */
  static createMessage (value) {
    // NOTE: Process `null` different from `undefined`.
    if (value === null) {
      return { [TYPE.NULL]: true };
    } else if (typeof value === 'boolean') {
      return ValueUtil.bool(value);
    } else if (typeof value === 'number') { // TODO(burdon): Detect float?
      return ValueUtil.integer(value);
    } else if (typeof value === 'string') {
      return ValueUtil.string(value);
    } else if (typeof value === 'object') {
      return ValueUtil.object(value);
    } else {
      throw Error(`Invalid value: ${value}`);
    }
  }

  static bool (value) {
    return { [TYPE.BOOLEAN]: value };
  }

  static integer (value) {
    return { [TYPE.INTEGER]: value };
  }

  static float (value) {
    return { [TYPE.FLOAT]: value };
  }

  static string (value) {
    return { [TYPE.STRING]: value };
  }

  static datetime (value) {
    return { [TYPE.DATE]: value };
  }

  static object (value) {
    return {
      [TYPE.OBJECT]: {
        properties: Object.keys(value).map(key => KeyValueUtil.createMessage(key, value[key]))
      }
    };
  }

  static applyValue (object, key, value) {
    assert(object);
    assert(key);
    assert(value);

    // Remove property.
    // TODO(burdon): Null should stay set; remove if undefined?
    if (value[TYPE.NULL]) {
      delete object[key];
      return object;
    }

    // Apply object properties.
    if (value[TYPE.OBJECT]) {
      const { properties } = value[TYPE.OBJECT];
      const nestedObject = {};
      properties.forEach(({ key, value }) => ValueUtil.applyValue(nestedObject, key, value));
      object[key] = nestedObject;
      return object;
    }

    // Apply scalar.
    const field = SCALAR_TYPES.find(field => value[field] !== undefined);
    if (field) {
      object[key] = value[field];
      return object;
    }

    // Apply object.
    throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
  }
}

/**
 * Represents mutations on objects.
 *
 * { id, objectId, property, value, depends }
 */
export class MutationUtil {
  static applyMutations (object, messages) {
    messages.forEach(message => MutationUtil.applyMutation(object, message));
    return object;
  }

  static applyMutation (object, mutation) {
    const { operation = 0, key, value } = mutation;
    switch (operation) {
      case 0: {
        ValueUtil.applyValue(object, key, value);
        break;
      }

      // TODO(burdon): Other mutation types.
      default:
        throw new Error(`Operation not implemented: ${operation}`);
    }
  }
}

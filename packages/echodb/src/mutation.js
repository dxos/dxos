//
// Copyright 2020 DxOS
//

import assert from 'assert';
import debug from 'debug';

import { createId } from '@dxos/crypto';

const log = debug('dxos:echo:mutation');

/**
 * @typedef {Object} Value
 * @typedef {Object} KeyValue
 * @typedef {Object} Mutation
 */

/**
 * Represents a named property value.
 */
export class KeyValueUtil {
  static createMessage (property, value) {
    console.assert(property);

    return {
      property,
      // eslint-disable-next-line no-use-before-define
      value: ValueUtil.createMessage(value)
    };
  }
}

const TYPE = {
  NULL: 'isNull',

  // Scalar.
  BOOLEAN: 'boolValue',
  INTEGER: 'intValue',
  FLOAT: 'floatValue',
  STRING: 'stringValue',

  BYTES: 'bytes',
  TIMESTAMP: 'timestamp',
  DATETIME: 'datetime',

  OBJECT: 'objectValue'
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
 * Represents scalar, array, and hierarchical values.
 * { null, boolean, number, string }
 */
export class ValueUtil {
  /**
   * @param {any} value
   * @return {{Value}}
   */
  // TODO(burdon): Rename createScalarValue.
  static createMessage (value) {
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
      [TYPE.OBJECT]: Object.keys(value).map(key => KeyValueUtil.createMessage(key, value[key]))
    };
  }
}

/**
 * Represents mutations on objects.
 *
 * { id, objectId, property, value, depends }
 */
export class MutationUtil {
  /**
   * @param objectId
   * @param value
   * @param [properties]
   * @return {{Mutation}}
   */
  static createMessage (objectId, value, properties) {
    console.assert(objectId);

    return {
      id: createId(),
      objectId,

      value,

      ...properties
    };
  }

  static applyMutations (object, messages) {
    messages.forEach(message => MutationUtil.applyMutation(object, message));
    return object;
  }

  static applyMutation (object, message) {
    // TODO(burdon): Currently assumes value property.
    if (message.value !== undefined) {
      MutationUtil.applyKeyValue(object, message.value);
    }
  }

  static applyKeyValue (object, message) {
    const { property, value } = message;
    assert(property, value);

    log(`applyKeyValue: ${JSON.stringify(property)}: ${JSON.stringify(value)}`);

    if (value[TYPE.NULL]) {
      delete object[property];
    } else if (value[TYPE.OBJECT]) {
      // TODO(dboreham): This matches the encoding above, but is it correct wrt protobuf?
      const objectValues = value[TYPE.OBJECT];
      const nestedObject = {};
      objectValues.forEach(value => MutationUtil.applyKeyValue(nestedObject, value));
      object[property] = nestedObject;
      return object;
    } else {
      // Apply scalar.
      const field = SCALAR_TYPES.find(field => value[field] !== undefined);
      if (field) {
        object[property] = value[field];
        return object;
      }

      // Apply object.
      throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
    }

    return object;
  }
}

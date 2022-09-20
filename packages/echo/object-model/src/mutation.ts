//
// Copyright 2020 DXOS.org
//

/* eslint-disable no-unused-vars */

import get from 'lodash.get';
import set from 'lodash.set';
import assert from 'node:assert';

import {
  KeyValue, ObjectMutation, ObjectMutationSet, KeyValueObject, Value
} from '@dxos/protocols/proto/dxos/echo/model/object';

import { removeKey } from './util';

/**
 * @typedef {Object} Value
 * @typedef {{ key:string, value:Value }} KeyValue
 * @typedef {Object} ObjectMutation
 * @typedef {Object} ObjectMutationSet
 */

enum Type {
  NULL = 'null',

  BOOLEAN = 'bool',
  INTEGER = 'int',
  FLOAT = 'float',
  STRING = 'string',

  BYTES = 'bytes',
  TIMESTAMP = 'timestamp',
  DATETIME = 'datetime',

  OBJECT = 'object'
}

const SCALAR_TYPES = [
  Type.BOOLEAN,
  Type.INTEGER,
  Type.FLOAT,
  Type.STRING,
  Type.BYTES,
  Type.TIMESTAMP,
  Type.DATETIME
];

// TODO(burdon): Reorganize functions.

/**
 * Represents a named property value.
 */
export class KeyValueUtil {
  static createMessage (key: string, value: any): KeyValue {
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
  static createMessage (value: any): Value {
    // NOTE: Process `null` different from `undefined`.
    if (value === null) {
      return { [Type.NULL]: true };
    } else if (typeof value === 'boolean') {
      return ValueUtil.bool(value);
    } else if (typeof value === 'number') {
      return value % 1 === 0 ? ValueUtil.integer(value) : ValueUtil.float(value);
    } else if (typeof value === 'string') {
      return ValueUtil.string(value);
    } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      return ValueUtil.bytes(value);
    } else if (typeof value === 'object') {
      return ValueUtil.object(value);
    } else {
      throw new Error(`Invalid value: ${value}`);
    }
  }

  static valueOf (value: Value): any {
    if (value.object !== undefined) {
      return ValueUtil.getObjectValue(value.object);
    }

    if (value.array !== undefined) {
      return value.array.values!.map(value => ValueUtil.valueOf(value));
    }

    if (value.int) {
      return parseInt(value.int);
    }

    const type = SCALAR_TYPES.find(type => value[type] !== undefined);
    if (type) {
      return value[type];
    }

    return undefined;
  }

  static bytes (value: Uint8Array): Value {
    return { [Type.BYTES]: value };
  }

  static bool (value: boolean): Value {
    return { [Type.BOOLEAN]: value };
  }

  static integer (value: number): Value {
    return { [Type.INTEGER]: value.toString() };
  }

  static float (value: number): Value {
    return { [Type.FLOAT]: value };
  }

  static string (value: string): Value {
    return { [Type.STRING]: value };
  }

  static datetime (value: string): Value {
    return { [Type.DATETIME]: value };
  }

  static object (value: Record<string, any>): Value {
    return {
      [Type.OBJECT]: {
        properties: Object.keys(value).map(key => KeyValueUtil.createMessage(key, value[key]))
      }
    };
  }

  // TODO(burdon): Refactor.
  static getObjectValue (value: KeyValueObject) {
    const nestedObject = {};
    const { properties } = value!;
    (properties ?? []).forEach(({ key, value }) => ValueUtil.applyValue(nestedObject, key!, value!));
    return nestedObject;
  }

  static getScalarValue (value: Value) {
    const type = SCALAR_TYPES.find(field => value[field] !== undefined);
    if (type) {
      return value[type];
    }
  }

  static applyKeyValue (object: any, keyValue: KeyValue) {
    const { key, value } = keyValue;
    return ValueUtil.applyValue(object, key!, value!);
  }

  static applyValue (object: any, key: string, value?: Value) {
    assert(object);
    assert(key);

    // Delete property.
    if (value === undefined) {
      return removeKey(object, key);
    }

    // Apply object properties.
    if (value[Type.OBJECT]) {
      set(object, key, ValueUtil.getObjectValue(value[Type.OBJECT]!));
      return object;
    }

    // Remove property.
    if (value[Type.NULL]) {
      set(object, key, null);
      return object;
    }

    // Apply integers.
    const intValue = value[Type.INTEGER];
    if (intValue !== undefined) {
      set(object, key, parseInt(intValue));
      return object;
    }

    // Apply scalars.
    const scalar = ValueUtil.getScalarValue(value);
    if (scalar !== undefined) {
      set(object, key, scalar);
      return object;
    }

    throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
  }
}

/**
 * Represents mutations on objects.
 */
export class MutationUtil {
  static applyMutationSet (object: any, message: ObjectMutationSet) {
    assert(message);
    const { mutations } = message;
    mutations?.forEach(mutation => MutationUtil.applyMutation(object, mutation));
    return object;
  }

  static applyMutation (object: any, mutation: ObjectMutation) {
    assert(object);
    const { operation = ObjectMutation.Operation.SET, key, value } = mutation;
    switch (operation) {
      case ObjectMutation.Operation.SET: {
        ValueUtil.applyValue(object, key!, value!);
        break;
      }

      case ObjectMutation.Operation.DELETE: {
        removeKey(object, key!);
        break;
      }

      case ObjectMutation.Operation.ARRAY_PUSH: {
        const values = get(object, key!, []);
        values.push(ValueUtil.valueOf(value!));
        set(object, key!, values);
        break;
      }

      case ObjectMutation.Operation.SET_ADD: {
        const values = new Set(get(object, key!, []));
        values.add(ValueUtil.valueOf(value!));
        set(object, key!, Array.from(values.values()));
        break;
      }

      case ObjectMutation.Operation.SET_DELETE: {
        const values = new Set(get(object, key!, []));
        values.delete(ValueUtil.valueOf(value!));
        set(object, key!, Array.from(values.values()));
        break;
      }

      // TODO(burdon): Other mutation types.
      default: {
        throw new Error(`Operation not implemented: ${operation}`);
      }
    }

    return object;
  }

  /**
   * Create single field mutation.
   */
  static createFieldMutation (key: string, value: any): ObjectMutation {
    return value === undefined ? {
      // NOTE: `null` is a legitimate value.
      operation: ObjectMutation.Operation.DELETE,
      key
    } : {
      operation: ObjectMutation.Operation.SET,
      key,
      value: ValueUtil.createMessage(value)
    };
  }

  /**
   * Create field mutations.
   */
  static createMultiFieldMutation (object: any): ObjectMutation[] {
    return Object.entries(object).map(([key, value]) => MutationUtil.createFieldMutation(key, value));
  }
}

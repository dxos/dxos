//
// Copyright 2020 DXOS.org
//

/* eslint-disable no-unused-vars */

import assert from 'assert';

import { protocol } from './proto';

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

/**
 * Represents a named property value.
 */
export class KeyValueUtil {
  static createMessage (key: string, value: any): protocol.dxos.echo.object.IKeyValue {
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
  static createMessage (value: any): protocol.dxos.echo.object.IValue {
    // NOTE: Process `null` different from `undefined`.
    if (value === null) {
      return { [Type.NULL]: true };
    } else if (typeof value === 'boolean') {
      return ValueUtil.bool(value);
    } else if (typeof value === 'number') {
      return (value % 1 === 0) ? ValueUtil.integer(value) : ValueUtil.float(value);
    } else if (typeof value === 'string') {
      return ValueUtil.string(value);
    } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      return ValueUtil.bytes(value);
    } else if (typeof value === 'object') {
      return ValueUtil.object(value);
    } else {
      throw Error(`Invalid value: ${value}`);
    }
  }

  static bytes (value: Uint8Array): protocol.dxos.echo.object.IValue {
    return { [Type.BYTES]: value };
  }

  static bool (value: boolean): protocol.dxos.echo.object.IValue {
    return { [Type.BOOLEAN]: value };
  }

  static integer (value: number): protocol.dxos.echo.object.IValue {
    return { [Type.INTEGER]: value };
  }

  static float (value: number): protocol.dxos.echo.object.IValue {
    return { [Type.FLOAT]: value };
  }

  static string (value: string): protocol.dxos.echo.object.IValue {
    return { [Type.STRING]: value };
  }

  static datetime (value: string): protocol.dxos.echo.object.IValue {
    return { [Type.DATETIME]: value };
  }

  static object (value: Record<string, any>): protocol.dxos.echo.object.IValue {
    return {
      [Type.OBJECT]: {
        properties: Object.keys(value).map(key => KeyValueUtil.createMessage(key, value[key]))
      }
    };
  }

  static applyValue (object: any, key: string, value: protocol.dxos.echo.object.IValue) {
    assert(object);
    assert(key);
    assert(value);

    // Remove property.
    // TODO(burdon): Null should stay set; remove if undefined?
    if (value[Type.NULL]) {
      delete object[key];
      return object;
    }

    // Apply object properties.
    if (value[Type.OBJECT]) {
      const nestedObject = {};
      const { properties }: { properties: protocol.dxos.echo.object.KeyValue[] } = value[Type.OBJECT]!;
      properties.forEach(({ key, value }) => ValueUtil.applyValue(nestedObject, key!, value!));
      object[key] = nestedObject;
      return object;
    }

    // Apply scalar.s
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
 */
export class MutationUtil {
  static applyMutationSet (object: any, message: protocol.dxos.echo.object.IObjectMutationSet) {
    assert(message);
    const { mutations } = message;
    mutations?.forEach(mutation => MutationUtil.applyMutation(object, mutation));
    return object;
  }

  static applyMutation (object: any, mutation: protocol.dxos.echo.object.IObjectMutation) {
    const { operation = protocol.dxos.echo.object.ObjectMutation.Operation.SET, key, value } = mutation;
    switch (operation) {
      // TODO(burdon): Namespace conflict when imported into echo-db.
      case 0: { // protocol.dxos.echo.object.ObjectMutation.Operation.SET: {
        ValueUtil.applyValue(object, key!, value!);
        break;
      }

      // TODO(burdon): Other mutation types.
      default:
        throw new Error(`Operation not implemented: ${operation}`);
    }
    return object;
  }
}

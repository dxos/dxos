//
// Copyright 2020 DXOS.org
//

/* eslint-disable no-unused-vars */

import assert from 'assert';

import { dxos } from './proto/gen/echo';

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
  static createMessage (key: string, value: any): dxos.echo.IKeyValue {
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
  static createMessage (value: any): dxos.echo.IValue {
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

  static bytes (value: Uint8Array): dxos.echo.IValue {
    return { [Type.BYTES]: value };
  }

  static bool (value: boolean): dxos.echo.IValue {
    return { [Type.BOOLEAN]: value };
  }

  static integer (value: number): dxos.echo.IValue {
    return { [Type.INTEGER]: value };
  }

  static float (value: number): dxos.echo.IValue {
    return { [Type.FLOAT]: value };
  }

  static string (value: string): dxos.echo.IValue {
    return { [Type.STRING]: value };
  }

  static datetime (value: string): dxos.echo.IValue {
    return { [Type.DATETIME]: value };
  }

  static object (value: Record<string, any>): dxos.echo.IValue {
    return {
      [Type.OBJECT]: {
        properties: Object.keys(value).map(key => KeyValueUtil.createMessage(key, value[key]))
      }
    };
  }

  static applyValue (object: any, key: string, value: dxos.echo.IValue) {
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
      const { properties } = value[Type.OBJECT]!;
      const nestedObject = {};
      (properties ?? []).forEach(({ key, value }) => ValueUtil.applyValue(nestedObject, key!, value!));
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
 *
 * { id, objectId, property, value, depends }
 */
export class MutationUtil {
  static applyMutations (object: any, messages: dxos.echo.ObjectMutation.IMutation[]) {
    messages.forEach(message => MutationUtil.applyMutation(object, message));
    return object;
  }

  static applyMutation (object: any, mutation: dxos.echo.ObjectMutation.IMutation) {
    const { operation = 0, key, value } = mutation;
    switch (operation) {
      case 0: {
        ValueUtil.applyValue(object, key!, value!);
        break;
      }

      // TODO(burdon): Other mutation types.
      default:
        throw new Error(`Operation not implemented: ${operation}`);
    }
  }

  static createMessage (objectId: string, { deleted = false }: { deleted?: boolean }): dxos.echo.IObjectMutation {
    return {
      objectId,
      deleted
    };
  }
}

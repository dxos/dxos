//
// Copyright 2019 Wireline, Inc.
//

import uuid from 'uuid/v4';

/**
 * @typedef {Object} Mutation
 */

/**
 * Represents scalar, array, and hierarchical values.
 *
 * { null, boolean, number, string }
 */
export class ValueUtil {

  static NULL     = 'isNull';
  static BOOLEAN  = 'boolValue';
  static INTEGER  = 'intValue';
  static FLOAT    = 'floatValue';       // TODO(burdon): Detect?
  static STRING   = 'stringValue';
  static OBJECT   = 'objectValue';

  static createMessage(value) {
    if (value === null || value === undefined) {
      return { [ValueUtil.NULL]: true };
    } else if (typeof value === 'boolean') {
      return { [ValueUtil.BOOLEAN]: value };
    } else if (typeof value === 'number') {
      return { [ValueUtil.INTEGER]: value };
    } else if (typeof value === 'string') {
      return { [ValueUtil.STRING]: value };
    } else if (typeof value === 'object') {
      return { [ValueUtil.OBJECT]: value };
    } else {
      throw Error(`Illegal value: ${value}`);
    }
  }

  static bool(value) {
    return { [ValueUtil.BOOLEAN]: value };
  }

  static integer(value) {
    return { [ValueUtil.INTEGER]: value };
  }

  static float(value) {
    return { [ValueUtil.FLOAT]: value };
  }

  static string(value) {
    return { [ValueUtil.STRING]: value };
  }

  static datetime(value) {
    return { [ValueUtil.DATE]: value };
  }

  static fromMessage(value) {
    console.assert(value);

    const types = [
      ValueUtil.BOOLEAN,
      ValueUtil.INTEGER,
      ValueUtil.FLOAT,
      ValueUtil.STRING,
      ValueUtil.OBJECT,
      ValueUtil.DATE
    ];

    return value[types.find(type => value[type] !== undefined)];
  }
}

/**
 * Represents a named property value.
 */
export class KeyValueUtil {

  static createMessage(property, value) {
    console.assert(property);

    return {
      property,
      value: ValueUtil.createMessage(value),
    };
  }
}

/**
 * Represents mutations on objects.
 *
 * { id, objectId, property, value, depends }
 */
export class MutationUtil {

  static createMessage(objectId, value, options = undefined) {
    console.assert(objectId);

    return {
      id: uuid(),
      objectId,
      value,
      ...options
    };
  }

  // TODO(burdon): Recursive object, array (see alienlabs).

  static applyMutations(object, messages) {
    messages.forEach(message => MutationUtil.applyMutation(object, message));
    return object;
  }

  static applyMutation(object, message) {
    const { value: { property, value } } = message;

    if (value[ValueUtil.NULL]) {
      delete object[property];
    } else {
      // TODO(burdon): Check type from proto schema.
      object[property] = ValueUtil.fromMessage(value);
    }

    return object;
  }
}

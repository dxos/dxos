//
// Copyright 2019 Wireline, Inc.
//

import uuid from 'uuid/v4';

/**
 * Represents scalar, array, and hierarchical values.
 *
 * { null, boolean, number, string }
 */
export class ValueProtoUtil {

  static NULL     = 'isNull';
  static BOOLEAN  = 'boolValue';
  static INTEGER  = 'intValue';
  static FLOAT    = 'floatValue';       // TODO(burdon): Detect?
  static STRING   = 'stringValue';
  static OBJECT   = 'objectValue';

  static createMessage(value) {
    if (value === null || value === undefined) {
      return { [ValueProtoUtil.NULL]: true };
    } else if (typeof value === 'boolean') {
      return { [ValueProtoUtil.BOOLEAN]: value };
    } else if (typeof value === 'number') {
      return { [ValueProtoUtil.INTEGER]: value };
    } else if (typeof value === 'string') {
      return { [ValueProtoUtil.STRING]: value };
    } else if (typeof value === 'object') {
      return { [ValueProtoUtil.OBJECT]: value };
    } else {
      throw Error(`Illegal value: ${value}`);
    }
  }

  static bool(value) {
    return { [ValueProtoUtil.BOOLEAN]: value };
  }

  static integer(value) {
    return { [ValueProtoUtil.INTEGER]: value };
  }

  static float(value) {
    return { [ValueProtoUtil.FLOAT]: value };
  }

  static string(value) {
    return { [ValueProtoUtil.STRING]: value };
  }

  static datetime(value) {
    return { [ValueProtoUtil.DATE]: value };
  }

  static fromMessage(value) {
    console.assert(value);

    const types = [
      ValueProtoUtil.BOOLEAN,
      ValueProtoUtil.INTEGER,
      ValueProtoUtil.FLOAT,
      ValueProtoUtil.STRING,
      ValueProtoUtil.OBJECT,
      ValueProtoUtil.DATE
    ];

    return value[types.find(type => value[type] !== undefined)];
  }
}

/**
 * Represents a named property value.
 */
export class KeyValueProtoUtil {

  static createMessage(property, value) {
    console.assert(property);

    return {
      property,
      value: ValueProtoUtil.createMessage(value),
    };
  }
}

/**
 * Represents mutations on objects.
 *
 * { id, objectId, property, value, depends }
 */
export class MutationProtoUtil {

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
    messages.forEach(message => MutationProtoUtil.applyMutation(object, message));
    return object;
  }

  static applyMutation(object, message) {
    const { value: { property, value } } = message;

    if (value[ValueProtoUtil.NULL]) {
      delete object[property];
    } else {
      // TODO(burdon): Check type from proto schema.
      object[property] = ValueProtoUtil.fromMessage(value);
    }

    return object;
  }
}

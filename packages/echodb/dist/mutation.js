"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MutationProtoUtil = exports.KeyValueProtoUtil = exports.ValueProtoUtil = void 0;

var _v = _interopRequireDefault(require("uuid/v4"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Represents scalar, array, and hierarchical values.
 *
 * { null, boolean, number, string }
 */
class ValueProtoUtil {
  // TODO(burdon): Detect?
  static createMessage(value) {
    if (value === null || value === undefined) {
      return {
        [ValueProtoUtil.NULL]: true
      };
    } else if (typeof value === 'boolean') {
      return {
        [ValueProtoUtil.BOOLEAN]: value
      };
    } else if (typeof value === 'number') {
      return {
        [ValueProtoUtil.INTEGER]: value
      };
    } else if (typeof value === 'string') {
      return {
        [ValueProtoUtil.STRING]: value
      };
    } else if (typeof value === 'object') {
      return {
        [ValueProtoUtil.OBJECT]: value
      };
    } else {
      throw Error("Illegal value: ".concat(value));
    }
  }

  static bool(value) {
    return {
      [ValueProtoUtil.BOOLEAN]: value
    };
  }

  static integer(value) {
    return {
      [ValueProtoUtil.INTEGER]: value
    };
  }

  static float(value) {
    return {
      [ValueProtoUtil.FLOAT]: value
    };
  }

  static string(value) {
    return {
      [ValueProtoUtil.STRING]: value
    };
  }

  static datetime(value) {
    return {
      [ValueProtoUtil.DATE]: value
    };
  }

  static fromMessage(value) {
    console.assert(value);
    const types = [ValueProtoUtil.BOOLEAN, ValueProtoUtil.INTEGER, ValueProtoUtil.FLOAT, ValueProtoUtil.STRING, ValueProtoUtil.OBJECT, ValueProtoUtil.DATE];
    return value[types.find(type => value[type] !== undefined)];
  }

}
/**
 * Represents a named property value.
 */


exports.ValueProtoUtil = ValueProtoUtil;

_defineProperty(ValueProtoUtil, "NULL", 'isNull');

_defineProperty(ValueProtoUtil, "BOOLEAN", 'boolValue');

_defineProperty(ValueProtoUtil, "INTEGER", 'intValue');

_defineProperty(ValueProtoUtil, "FLOAT", 'floatValue');

_defineProperty(ValueProtoUtil, "STRING", 'stringValue');

_defineProperty(ValueProtoUtil, "OBJECT", 'objectValue');

class KeyValueProtoUtil {
  static createMessage(property, value) {
    console.assert(property);
    return {
      property,
      value: ValueProtoUtil.createMessage(value)
    };
  }

}
/**
 * Represents mutations on objects.
 *
 * { id, objectId, property, value, depends }
 */


exports.KeyValueProtoUtil = KeyValueProtoUtil;

class MutationProtoUtil {
  static createMessage(objectId, value, options = undefined) {
    console.assert(objectId);
    return {
      id: (0, _v.default)(),
      objectId,
      value,
      ...options
    };
  } // TODO(burdon): Recursive object, array (see alienlabs).


  static applyMutations(object, messages) {
    messages.forEach(message => MutationProtoUtil.applyMutation(object, message));
    return object;
  }

  static applyMutation(object, message) {
    const {
      value: {
        property,
        value
      }
    } = message;

    if (value[ValueProtoUtil.NULL]) {
      delete object[property];
    } else {
      // TODO(burdon): Check type from proto schema.
      object[property] = ValueProtoUtil.fromMessage(value);
    }

    return object;
  }

}

exports.MutationProtoUtil = MutationProtoUtil;
//# sourceMappingURL=mutation.js.map
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MutationUtil = exports.KeyValueUtil = exports.ValueUtil = void 0;

var _v = _interopRequireDefault(require("uuid/v4"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Represents scalar, array, and hierarchical values.
 *
 * { null, boolean, number, string }
 */
class ValueUtil {
  // TODO(burdon): Detect?
  static createMessage(value) {
    if (value === null || value === undefined) {
      return {
        [ValueUtil.NULL]: true
      };
    } else if (typeof value === 'boolean') {
      return {
        [ValueUtil.BOOLEAN]: value
      };
    } else if (typeof value === 'number') {
      return {
        [ValueUtil.INTEGER]: value
      };
    } else if (typeof value === 'string') {
      return {
        [ValueUtil.STRING]: value
      };
    } else if (typeof value === 'object') {
      return {
        [ValueUtil.OBJECT]: value
      };
    } else {
      throw Error(`Illegal value: ${value}`);
    }
  }

  static bool(value) {
    return {
      [ValueUtil.BOOLEAN]: value
    };
  }

  static integer(value) {
    return {
      [ValueUtil.INTEGER]: value
    };
  }

  static float(value) {
    return {
      [ValueUtil.FLOAT]: value
    };
  }

  static string(value) {
    return {
      [ValueUtil.STRING]: value
    };
  }

  static datetime(value) {
    return {
      [ValueUtil.DATE]: value
    };
  }

  static fromMessage(value) {
    console.assert(value);
    const types = [ValueUtil.BOOLEAN, ValueUtil.INTEGER, ValueUtil.FLOAT, ValueUtil.STRING, ValueUtil.OBJECT, ValueUtil.DATE];
    return value[types.find(type => value[type] !== undefined)];
  }

}
/**
 * Represents a named property value.
 */


exports.ValueUtil = ValueUtil;

_defineProperty(ValueUtil, "NULL", 'isNull');

_defineProperty(ValueUtil, "BOOLEAN", 'boolValue');

_defineProperty(ValueUtil, "INTEGER", 'intValue');

_defineProperty(ValueUtil, "FLOAT", 'floatValue');

_defineProperty(ValueUtil, "STRING", 'stringValue');

_defineProperty(ValueUtil, "OBJECT", 'objectValue');

class KeyValueUtil {
  static createMessage(property, value) {
    console.assert(property);
    return {
      property,
      value: ValueUtil.createMessage(value)
    };
  }

}
/**
 * Represents mutations on objects.
 *
 * { id, objectId, property, value, depends }
 */


exports.KeyValueUtil = KeyValueUtil;

class MutationUtil {
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
    messages.forEach(message => MutationUtil.applyMutation(object, message));
    return object;
  }

  static applyMutation(object, message) {
    const {
      value: {
        property,
        value
      }
    } = message;

    if (value[ValueUtil.NULL]) {
      delete object[property];
    } else {
      // TODO(burdon): Check type from proto schema.
      object[property] = ValueUtil.fromMessage(value);
    }

    return object;
  }

}

exports.MutationUtil = MutationUtil;
//# sourceMappingURL=mutation.js.map
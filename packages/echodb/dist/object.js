"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ObjectModel = void 0;

var _events = require("events");

var _v = _interopRequireDefault(require("uuid/v4"));

var _mutation = require("./mutation");

var _util = require("./util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Simple Object Datastore composed from log mutations.
 */
class ObjectModel extends _events.EventEmitter {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_objectById", new Map());
  }

  /**
   * Create a set mutation messages from a collection of objects.
   * @param objects
   * @return {[]}
   */
  static fromObjects(objects) {
    return objects.reduce((messages, object) => {
      return messages.concat(ObjectModel.fromObject(object));
    }, []);
  }

  static fromObject(object) {
    return Object.keys(object.properties || {}).map(property => {
      return _mutation.MutationProtoUtil.createMessage(object.id, _mutation.KeyValueProtoUtil.createMessage(property, object.properties[property]));
    });
  }
  /**
   * Merge the given feeds, respecting the order when messages include the ID of a previous message.
   * @param {[{ id, messages }]} feeds
   * @return {[{Message}]}
   */


  static mergeFeeds(feeds) {
    // Ordered list of merged messages.
    const merged = []; // Set of already merged objects (used to unlock pending messages).

    const messages = new Set(); // Initial feed cursors (sorted to ensure deterministic processing of messages.

    const feedCursors = feeds.map(() => ({
      position: 0,
      pending: null
    })).sort((0, _util.sortByProperty)('id')); // Gets the index of the next available feed to process.

    const nextIndex = current => {
      let count = feedCursors.length;
      let next = -1;

      while (count > 0 && next === -1) {
        if (++current === feedCursors.length) {
          current = 0;
        } // Skip if exhausted or pending.
        // TODO(burdon): Currently each feed blocks until the depending mutation is resolved, but we could
        // restrict the dependencies to individual objects and create multiple concurrent DAGs.


        if (feedCursors[current].position === feeds[current].messages.length || feedCursors[current].pending) {
          count--;
          continue;
        }

        next = current;
      }

      return next;
    }; // Breadth-first merge.


    let current = -1;

    while ((current = nextIndex(current)) !== -1) {
      const index = feedCursors[current]; // Continue if pending.

      const message = feeds[current].messages[index.position];

      if (message.depends && !messages.has(message.depends)) {
        index.pending = message.depends;
        continue;
      } // Unlock pending messages.


      feedCursors.forEach(index => {
        if (index.pending === message.id) {
          index.pending = null;
        }
      }); // Append the message and increment the cursor.

      messages.add(message.id);
      merged.push(message);
      index.position++;
    }

    return merged;
  } // Objects indexed by ID.


  /**
   * @param {LogViewAdapter} view
   * @return {ObjectModel}
   */
  // TODO(burdon): Add disconnect.
  connect(view) {
    console.assert(view);
    this._view = view;
    view.on('update', log => {
      this.applyMutations(log);
      this.emit('update', this);
    });
    return this;
  } // TODO(burdon): Remove.


  get objects() {
    return this._objectById;
  }

  getTypes() {
    return Array.from(Array.from(this._objectById.values()).reduce((set, {
      id
    }) => set.add(ObjectModel.parseId(id).type), new Set()));
  }
  /**
   * Returns an unordered array of objects by type.
   */


  getObjects(type) {
    return Array.from(this._objectById.values()).filter(({
      id
    }) => ObjectModel.parseId(id).type === type);
  }

  reset() {
    this._objectById.clear();

    return this;
  }

  async commitMutations(mutations = []) {
    console.assert(this._view);
    return this._view.appendMutations(mutations);
  } // TODO(burdon): Compute delta (from last apply)?


  applyMutations(mutations = []) {
    this.reset();
    mutations.forEach(message => {
      const {
        objectId,
        deleted
      } = message;

      if (objectId) {
        if (deleted) {
          this._objectById.delete(objectId);
        } else {
          let object = this._objectById.get(objectId);

          if (!object) {
            object = {
              id: objectId,
              properties: {}
            };

            this._objectById.set(objectId, object);
          }

          _mutation.MutationProtoUtil.applyMutation(object.properties, message);
        }
      }
    });
    return this;
  }

}

exports.ObjectModel = ObjectModel;

_defineProperty(ObjectModel, "createId", (type, id = undefined) => {
  console.assert(type);
  return "".concat(type, "/").concat(id || (0, _v.default)());
});

_defineProperty(ObjectModel, "parseId", id => {
  const parts = id.split('/');
  console.assert(parts.length === 2 ? parts[0] : parts[1]);
  return {
    type: parts[0],
    id: parts[1]
  };
});
//# sourceMappingURL=object.js.map
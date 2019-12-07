"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ItemModel = void 0;

var _lodash = _interopRequireDefault(require("lodash.merge"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// Copyright 2019 Wireline, Inc.
//
// TODO(burdon): Bucket.
class ItemModel {
  constructor(view) {
    console.assert(view);
    this._view = view;
  }

  get meta() {
    let {
      meta
    } = this._view; // TODO(burdon): Hack, since item schems currently doesn't have `meta` field.

    if (!meta) {
      if (this.log.length) {
        const {
          version
        } = this.log[0];
        meta = {
          version
        };
      }
    }

    return meta || {};
  }

  get log() {
    return this._view.log || [];
  }

  setMeta(meta) {
    return this.updateItem({
      meta
    });
  }

  setTitle(title) {
    return this.updateItem({
      title
    });
  } // TODO(burdon): Update schema (add version, move type into meta, etc.)


  updateItem(obj) {
    const {
      type,
      title,
      meta
    } = this._view;
    const data = (0, _lodash.default)({
      type,
      title,
      meta
    }, obj);
    return this._view.update(data);
  }

  appendChange(message) {
    return this._view.appendChange(message);
  }

}

exports.ItemModel = ItemModel;
//# sourceMappingURL=item.js.map
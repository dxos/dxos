"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogViewAdapter = void 0;

var _events = require("events");

//
// Copyright 2019 Wireline, Inc.
//

/**
 * Wraps kappa view, provising synchronous access to logs.
 */
class LogViewAdapter extends _events.EventEmitter {
  static async createView(framework, bucketId) {
    // User data is not differentiated by "type" (just bucket).
    const viewName = 'data'; // Creates a LogsView instance.

    framework.viewManager.registerView({
      name: viewName
    });
    return new LogViewAdapter(framework.kappa.api[viewName], bucketId);
  }
  /**
   * @param {LogsView} view - View wraps kappa view.
   * @param bucketId - Data bucket.
   */


  constructor(view, bucketId) {
    super();
    console.assert(view);
    console.assert(bucketId);
    this._view = view;
    this._bucketId = bucketId;
    this._log = [];

    this._view.onChange(bucketId, log => {
      const {
        changes
      } = log;
      this._log = changes;
      this.emit('update', this._log);
    });
  }

  get log() {
    return this._log;
  }

  async getLog() {
    return this._view.getLogs(this._bucketId);
  }

  async appendMutations(mutations) {
    for (const mutation of mutations) {
      await this._view.appendChange(this._bucketId, mutation);
    }
  }

}

exports.LogViewAdapter = LogViewAdapter;
//# sourceMappingURL=view.js.map
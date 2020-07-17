//
// Copyright 2020 DxOS.
//

require('source-map-support').install();

if (typeof window !== 'undefined' && typeof process !== 'undefined') {
  process.nextTick = function (fn) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }

    queueMicrotask(() => fn(...args));
  };
}

module.exports = require('./dist/index');

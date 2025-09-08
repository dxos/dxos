"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSnapshot = void 0;
/**
 * Returns a non-reactive snapshot of the given live object.
 * @deprecated Use `getSnapshot` from `@dxos/live-object` instead.
 */
// TODO(wittjosiah): Types.
var getSnapshot = function (object) {
    if (typeof object !== 'object') {
        return object;
    }
    if (Array.isArray(object)) {
        return object.map(exports.getSnapshot);
    }
    var result = {};
    for (var key in object) {
        result[key] = (0, exports.getSnapshot)(object[key]);
    }
    return result;
};
exports.getSnapshot = getSnapshot;

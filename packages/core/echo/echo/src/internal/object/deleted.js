"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDeleted = void 0;
var model_1 = require("./model");
/**
 * @returns `true` if the object has been marked as deleted.
 */
var isDeleted = function (obj) {
    var _a;
    if (obj[model_1.DeletedId] === undefined) {
        throw new Error('Object does not support deletion marker');
    }
    return (_a = obj[model_1.DeletedId]) !== null && _a !== void 0 ? _a : false;
};
exports.isDeleted = isDeleted;

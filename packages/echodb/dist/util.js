"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sortByProperty = void 0;

//
// Copyright 2019 Wireline, Inc.
//
const sortByProperty = property => ({
  [property]: a
}, {
  [property]: b
}) => a > b ? 1 : a < b ? -1 : 0;

exports.sortByProperty = sortByProperty;
//# sourceMappingURL=util.js.map
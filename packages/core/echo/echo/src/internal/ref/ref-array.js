"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefArray = void 0;
var util_1 = require("@dxos/util");
var ref_1 = require("./ref");
/**
 * Helper functions for working with arrays of refs.
 */
exports.RefArray = Object.freeze({
    /**
     * @returns all resolved targets.
     */
    targets: function (refs) {
        return refs.map(function (ref) { return ref.target; }).filter(util_1.isNonNullable);
    },
    /**
     * Load all referenced objects.
     */
    loadAll: function (refs) {
        return Promise.all(refs.map(function (ref) { return ref.load(); }));
    },
    /**
     * Removes the ref with the given id.
     */
    removeById: function (refs, id) {
        var index = refs.findIndex(ref_1.Ref.hasObjectId(id));
        if (index >= 0) {
            refs.splice(index, 1);
        }
    },
});

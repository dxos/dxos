"use strict";
//
// Copyright 2020 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.raise = void 0;
/**
 * Immediatelly throws an error passed as an argument.
 *
 * Usefull for throwing errors from inside expressions.
 * For example:
 * ```
 * const item = model.getById(someId) ?? raise(new Error('Not found'));
 * ```
 * @param error
 */
const raise = (error) => {
    throw error;
};
exports.raise = raise;
//# sourceMappingURL=raise.js.map
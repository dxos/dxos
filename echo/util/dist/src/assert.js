"use strict";
//
// Copyright 2020 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkType = void 0;
/**
 * A simple syntax sugar to write `value as T` as a statement.
 *
 * NOTE: This does not provide any type safety.
 * It's just for convinience so that autocomplete works for value.
 * It's recomended to check the type URL mannuly beforehand or use `assertAnyType` instead.
 * @param value
 */
function checkType(value) {
    return value;
}
exports.checkType = checkType;
//# sourceMappingURL=assert.js.map
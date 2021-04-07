"use strict";
//
// Copyright 2020 DXOS.org
//
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LazyMap = void 0;
const assert_1 = __importDefault(require("assert"));
/**
 * Map with lazily created values.
 */
// TODO(burdon): Create multimap (e.g., map of sets)?
class LazyMap extends Map {
    constructor(_initFn) {
        super();
        this._initFn = _initFn;
    }
    getOrInit(key) {
        assert_1.default(key);
        if (this.has(key)) {
            return this.get(key);
        }
        else {
            const value = this._initFn(key);
            this.set(key, value);
            return value;
        }
    }
}
exports.LazyMap = LazyMap;
//# sourceMappingURL=map.js.map
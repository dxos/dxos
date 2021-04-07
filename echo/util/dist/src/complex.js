"use strict";
//
// Copyright 2020 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeMap = exports.ComplexMap = exports.makeSet = exports.ComplexSet = void 0;
const raise_1 = require("./raise");
/**
 * A set implementation that can hold complex values (like Buffer).
 *
 * The user must provide a projection function which returns a primitive
 * representation of the complex value. This function must be 1-to-1 mapping.
 *
 * Look at `../complex.test.ts` for usage examples.
 */
class ComplexSet {
    constructor(_projection, values) {
        this._projection = _projection;
        this._values = new Map();
        if (values) {
            for (const value of values) {
                this.add(value);
            }
        }
    }
    add(value) {
        this._values.set(this._projection(value), value);
        return this;
    }
    clear() {
        this._values.clear();
    }
    delete(value) {
        return this._values.delete(this._projection(value));
    }
    forEach(callbackfn, thisArg) {
        if (thisArg) {
            callbackfn = callbackfn.bind(thisArg);
        }
        this._values.forEach((value) => callbackfn(value, value, this));
    }
    has(value) {
        return this._values.has(this._projection(value));
    }
    get size() {
        return this.size;
    }
    [Symbol.iterator]() {
        return this._values.values();
    }
    *entries() {
        for (const value of this._values.values()) {
            yield [value, value];
        }
    }
    keys() {
        return this[Symbol.iterator]();
    }
    values() {
        return this[Symbol.iterator]();
    }
    get [Symbol.toStringTag]() {
        return 'ComplexSet';
    }
}
exports.ComplexSet = ComplexSet;
/**
 * Create a subclass of ComplexSet with predefined projection function.
 */
const makeSet = (projection) => class BoundComplexSet extends ComplexSet {
    constructor(values) {
        super(projection, values);
    }
};
exports.makeSet = makeSet;
/**
 * A map implementation that can hold complex values (like Buffer) as keys.
 *
 * The user must provide a projection function for map keys which returns a primitive
 * representation of the complex value. This function must be 1-to-1 mapping.
 *
 * Look at `../complex.test.ts` for usage examples.
 */
class ComplexMap {
    constructor(_keyProjection, entries) {
        this._keyProjection = _keyProjection;
        this._keys = new Map();
        this._values = new Map();
        if (entries) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
    }
    clear() {
        this._keys.clear();
        this._values.clear();
    }
    delete(key) {
        const keyDeleted = this._keys.delete(this._keyProjection(key));
        const valueDeleted = this._values.delete(this._keyProjection(key));
        return keyDeleted || valueDeleted;
    }
    forEach(callbackfn, thisArg) {
        if (thisArg) {
            callbackfn = callbackfn.bind(thisArg);
        }
        this._keys.forEach((key, primitive) => {
            var _a;
            return callbackfn((_a = this._values.get(primitive)) !== null && _a !== void 0 ? _a : raise_1.raise(new Error('Map corrupted')), key, this);
        });
    }
    get(key) {
        return this._values.get(this._keyProjection(key));
    }
    has(key) {
        return this._keys.has(this._keyProjection(key));
    }
    set(key, value) {
        const primitive = this._keyProjection(key);
        this._keys.set(primitive, key);
        this._values.set(primitive, value);
        return this;
    }
    get size() {
        return this._keys.size;
    }
    *[Symbol.iterator]() {
        var _a;
        for (const [primitive, key] of this._keys) {
            const value = (_a = this._values.get(primitive)) !== null && _a !== void 0 ? _a : raise_1.raise(new Error('Map corrupted'));
            yield [key, value];
        }
    }
    entries() {
        return this[Symbol.iterator]();
    }
    keys() {
        return this._keys.values();
    }
    values() {
        return this._values.values();
    }
    get [Symbol.toStringTag]() {
        return 'ComplexMap';
    }
}
exports.ComplexMap = ComplexMap;
/**
 * Create a subclass of ComplexMap with predefined key projection function.
 */
const makeMap = (keyProjection) => class BoundComplexMap extends ComplexMap {
    constructor(entries) {
        super(keyProjection, entries);
    }
};
exports.makeMap = makeMap;
//# sourceMappingURL=complex.js.map
"use strict";
//
// Copyright 2020 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("@dxos/crypto");
const complex_1 = require("./complex");
const PulicKeySet = complex_1.makeSet(crypto_1.keyToString);
test('ComplexSet', () => {
    const key1 = crypto_1.randomBytes();
    const key2 = crypto_1.randomBytes();
    const key3 = crypto_1.randomBytes();
    const set = new PulicKeySet([key1]);
    expect(set.has(key1)).toBe(true);
    expect(set.has(key2)).toBe(false);
    expect(Array.from(set.values())).toEqual([key1]);
    set.add(key1);
    expect(Array.from(set.values())).toEqual([key1]);
    set.add(key2);
    expect(set.has(key1)).toBe(true);
    expect(set.has(key2)).toBe(true);
    expect(set.has(key3)).toBe(false);
    expect(Array.from(set.values())).toEqual([key1, key2]);
    set.delete(key1);
    expect(set.has(key1)).toBe(false);
    expect(set.has(key2)).toBe(true);
    expect(Array.from(set.values())).toEqual([key2]);
});
const PulicKeyMap = complex_1.makeMap(crypto_1.keyToString);
test('ComplexMap', () => {
    const key1 = crypto_1.randomBytes();
    const key2 = crypto_1.randomBytes();
    const key3 = crypto_1.randomBytes();
    const map = new PulicKeyMap([[key1, 'a']]);
    expect(map.has(key1)).toBe(true);
    expect(map.has(key2)).toBe(false);
    expect(map.get(key1)).toEqual('a');
    expect(Array.from(map.entries())).toEqual([[key1, 'a']]);
    map.set(key1, 'b');
    expect(Array.from(map.entries())).toEqual([[key1, 'b']]);
    expect(map.get(key1)).toEqual('b');
    map.set(key2, 'c');
    expect(map.has(key1)).toBe(true);
    expect(map.has(key2)).toBe(true);
    expect(map.has(key3)).toBe(false);
    expect(map.get(key1)).toEqual('b');
    expect(map.get(key2)).toEqual('c');
    expect(Array.from(map.entries())).toEqual([[key1, 'b'], [key2, 'c']]);
    expect(Array.from(map.keys())).toEqual([key1, key2]);
    expect(Array.from(map.values())).toEqual(['b', 'c']);
    map.delete(key1);
    expect(map.has(key1)).toBe(false);
    expect(map.has(key2)).toBe(true);
    expect(Array.from(map.entries())).toEqual([[key2, 'c']]);
});
//# sourceMappingURL=complex.test.js.map
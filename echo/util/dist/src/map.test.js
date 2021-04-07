"use strict";
//
// Copyright 2020 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
const map_1 = require("./map");
describe('map', () => {
    test('set', () => {
        const map = new map_1.LazyMap(() => new Set());
        map.getOrInit('test').add('foo');
        expect(map.getOrInit('test').size).toBe(1);
    });
});
//# sourceMappingURL=map.test.js.map
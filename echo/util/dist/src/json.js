"use strict";
//
// Copyright 2020 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonReplacer = void 0;
const util_1 = require("util");
const crypto_1 = require("@dxos/crypto");
/**
 * JSON.stringify replacer.
 */
function jsonReplacer(key, value) {
    // TODO(burdon): Why is this represented as { type: 'Buffer', data }
    if (value !== null && typeof value === 'object' && typeof value[util_1.inspect.custom] === 'function') {
        return value[util_1.inspect.custom]();
    }
    if (value !== null && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
        if (value.data.length === 32) {
            const key = Buffer.from(value.data);
            return `[${crypto_1.humanize(key)}]:[${crypto_1.keyToString(key)}]`;
        }
        else {
            const buf = Buffer.from(value.data);
            return buf.inspect();
        }
    }
    // TODO(burdon): Option.
    // if (Array.isArray(value)) {
    //   return value.length;
    // } else {
    return value;
    // }
}
exports.jsonReplacer = jsonReplacer;
//# sourceMappingURL=json.js.map
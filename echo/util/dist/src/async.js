"use strict";
//
// Copyright 2020 DXOS.org
//
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trigger = exports.latch = exports.sink = void 0;
const assert_1 = __importDefault(require("assert"));
const async_1 = require("@dxos/async");
/**
 * Waits for the specified number of events from the given emitter.
 * @param emitter
 * @param event
 * @param count
 */
// TODO(marik-d): Use version from @dxos/async
const sink = (emitter, event, count = 1) => {
    let resolver;
    let counter = 0;
    const listener = () => {
        if (++counter === count) {
            emitter.off(event, listener);
            resolver();
        }
    };
    emitter.on(event, listener);
    return new Promise(resolve => {
        resolver = resolve;
    });
};
exports.sink = sink;
// TODO(marik-d): Use version from @dxos/async
const latch = (n = 1) => {
    assert_1.default(n > 0);
    let callback;
    const promise = new Promise((resolve) => {
        callback = value => resolve(value);
    });
    let count = 0;
    return [
        promise,
        () => {
            if (++count === n) {
                callback(count);
            }
        }
    ];
};
exports.latch = latch;
// TODO(marik-d): Use version from @dxos/async
class Trigger {
    constructor() {
        this.reset();
    }
    wait() {
        return this._promise;
    }
    wake() {
        this._wake();
    }
    reset() {
        const [getPromise, wake] = async_1.trigger();
        this._promise = getPromise();
        this._wake = wake;
    }
}
exports.Trigger = Trigger;
//# sourceMappingURL=async.js.map
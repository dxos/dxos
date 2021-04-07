"use strict";
//
// Copyright 2020 DXOS.org
//
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WritableArray = exports.createLoggingTransform = exports.createTransform = exports.createPassThrough = exports.createWritable = exports.createReadable = exports.createWritableFeedStream = exports.createAny = void 0;
const debug_1 = __importDefault(require("debug"));
const stream_1 = require("stream");
const codec_protobuf_1 = require("@dxos/codec-protobuf");
const log = debug_1.default('dxos:stream');
const error = debug_1.default('dxos:stream:error');
//
// Stream utils.
// https://nodejs.org/api/stream.html
// NOTE: Turn on 'dxox:*:error' to see errors within callbacks that cause the following error:
// Error [ERR_MULTIPLE_CALLBACK]: Callback called multiple times
//
/**
 * NOTE: The parameterized type `T` should be the generated interface, whereas the `typeUrl` should be the classnae.
 * @param data
 * @param typeUrl
 */
// TODO(burdon): Move to @dxos/codec.
// TODO(burdon): The parent should call this (not the message creator).
// TODO(burdon): Create version with short into code (for system types); Make compatable with google any.
function createAny(data, typeUrl) {
    return codec_protobuf_1.any(typeUrl, data);
}
exports.createAny = createAny;
/**
 * Returns a stream that appends messages directly to a hypercore feed.
 * @param feed
 * @returns {NodeJS.WritableStream}
 */
// TODO(burdon): Move to @dxos/codec.
function createWritableFeedStream(feed) {
    return new stream_1.Writable({
        objectMode: true,
        write(message, _, callback) {
            feed.append(message, callback);
        }
    });
}
exports.createWritableFeedStream = createWritableFeedStream;
/**
 * Creates a readStream stream that can be used as a buffer into which messages can be pushed.
 */
function createReadable() {
    return new stream_1.Readable({
        objectMode: true,
        read() { }
    });
}
exports.createReadable = createReadable;
/**
 * Creates a writeStream object stream.
 * @param callback
 */
function createWritable(callback) {
    return new stream_1.Writable({
        objectMode: true,
        write: async (message, _, next) => {
            try {
                await callback(message);
                next();
            }
            catch (err) {
                error(err);
                next(err);
            }
        }
    });
}
exports.createWritable = createWritable;
/**
 * Creates a no-op transform.
 */
function createPassThrough() {
    return new stream_1.PassThrough({
        objectMode: true,
        transform: async (message, _, next) => {
            next(null, message);
        }
    });
}
exports.createPassThrough = createPassThrough;
/**
 * Creates a transform object stream.
 * @param callback
 */
function createTransform(callback) {
    return new stream_1.Transform({
        objectMode: true,
        transform: async (message, _, next) => {
            try {
                const response = await callback(message);
                next(null, response);
            }
            catch (err) {
                error(err);
                next(err);
            }
        }
    });
}
exports.createTransform = createTransform;
/**
 * Injectable logger.
 * @param logger
 */
function createLoggingTransform(logger = log) {
    return createTransform(message => {
        logger(message);
        return message;
    });
}
exports.createLoggingTransform = createLoggingTransform;
/**
 * Wriable stream that collects objects (e.g., for testing).
 */
class WritableArray extends stream_1.Writable {
    constructor() {
        super({ objectMode: true });
        this._objects = [];
    }
    clear() {
        this._objects = [];
    }
    get objects() {
        return this._objects;
    }
    _write(object, _, next) {
        this._objects.push(object);
        next();
    }
}
exports.WritableArray = WritableArray;
//# sourceMappingURL=stream.js.map
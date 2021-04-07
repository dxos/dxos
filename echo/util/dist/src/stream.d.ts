/// <reference types="node" />
import { Feed } from 'hypercore';
import { PassThrough, Readable, Transform, Writable } from 'stream';
/**
 * NOTE: The parameterized type `T` should be the generated interface, whereas the `typeUrl` should be the classnae.
 * @param data
 * @param typeUrl
 */
export declare function createAny<T>(data: T, typeUrl: string): any;
/**
 * Returns a stream that appends messages directly to a hypercore feed.
 * @param feed
 * @returns {NodeJS.WritableStream}
 */
export declare function createWritableFeedStream(feed: Feed): Writable;
/**
 * Creates a readStream stream that can be used as a buffer into which messages can be pushed.
 */
export declare function createReadable<T>(): Readable;
/**
 * Creates a writeStream object stream.
 * @param callback
 */
export declare function createWritable<T>(callback: (message: T) => Promise<void>): NodeJS.WritableStream;
/**
 * Creates a no-op transform.
 */
export declare function createPassThrough<T>(): PassThrough;
/**
 * Creates a transform object stream.
 * @param callback
 */
export declare function createTransform<R, W>(callback: (message: R) => Promise<W | undefined>): Transform;
/**
 * Injectable logger.
 * @param logger
 */
export declare function createLoggingTransform(logger?: Function): Transform;
/**
 * Wriable stream that collects objects (e.g., for testing).
 */
export declare class WritableArray<T> extends Writable {
    _objects: T[];
    constructor();
    clear(): void;
    get objects(): T[];
    _write(object: any, _: BufferEncoding, next: (error?: Error | null) => void): void;
}
//# sourceMappingURL=stream.d.ts.map
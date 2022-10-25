//
// Copyright 2022 DXOS.org
//

/**
 * Concatenate a readable stream's data into a single array.
 *
 * From https://github.com/stream-utils/stream-to-array, but does not depend on
 * any-promise which does not work in web workers due to using window in its
 * browser shim.
 */
export const streamToArray = (
  stream: NodeJS.ReadableStream
): Promise<any[]> => {
  let deferred: Promise<any[]>;

  if (!stream.readable) {
    deferred = Promise.resolve([]);
  } else {
    deferred = new Promise((resolve, reject) => {
      // stream is already ended
      if (!stream.readable) {
        return resolve([]);
      }

      let arr: any[] = [];

      const onData = (doc: any) => {
        arr?.push(doc);
      };

      const onEnd = (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(arr);
        }
        cleanup();
      };

      const onClose = () => {
        resolve(arr);
        cleanup();
      };

      const cleanup = () => {
        arr = [];
        stream.removeListener('data', onData);
        stream.removeListener('end', onEnd);
        stream.removeListener('error', onEnd);
        stream.removeListener('close', onClose);
      };

      stream.on('data', onData);
      stream.on('end', onEnd);
      stream.on('error', onEnd);
      stream.on('close', onClose);
    });
  }

  return deferred;
};

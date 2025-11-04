//
// Copyright 2025 DXOS.org
//

type Cb = () => void;

interface Query {
  id?: string[];
  typename?: string[];
}

/**
 * Lazy query result that can be executed.
 * Does not run without the run function being called.
 */
interface QueryResult<T> {
  /**
   * Execute the query and subscribe to the result.
   * @param next Called at least once with the first value (maybe synchronously) and then for every subsequent update.
   * @param error Called on error. `next` is never called after that.
   * @returns Function to dispose the query and unsubscribe.
   */
  run(onData: (value?: T[]) => void, onError: (err: Error) => void): Cb;
}

const QueryResult = Object.freeze({
  fromPromise: <T>(run: (onDispose: (cb: Cb) => void) => Promise<T[]>): QueryResult<T> => ({
    run: (onData, onError) => {
      const cbs: Cb[] = [];
      let disposed = false;
      const dispose = () => {
        cbs.forEach((cb) => cb());
        disposed = true;
      };
      run((cb) => (disposed ? cb() : cbs.push(cb))).then(
        (data) => {
          if (disposed) {
            return;
          }
          onData(data);
        },
        (err) => {
          dispose();
          onError(err);
        },
      );
      return dispose;
    },
  }),
});

interface _Resolver<T> {
  query(query: Query): QueryResult<T>;
}

//
// Copyright 2024 DXOS.org
//

/**
 * A utility for safely performing an asynchronous action on every item from source.
 * @param source elements passed to taskFactory.
 * @param taskFactory a function that converts an elements into an async task.
 * @param onError if provided will be called for every failed task.
 * @returns elements for which task execution failed.
 */
export const safeAwaitAll = async <T>(
  source: Array<T> | IterableIterator<T>,
  taskFactory: (item: T) => Promise<any>,
  onError?: (error: Error, item: T, idx: number) => void,
): Promise<T[]> => {
  const failedItems: T[] = [];
  await Promise.all(
    [...source].map(async (item, idx) => {
      try {
        await taskFactory(item);
      } catch (err: any) {
        if (onError) {
          onError(err, item, idx);
        }
        failedItems.push(item);
      }
    }),
  );
  return failedItems;
};

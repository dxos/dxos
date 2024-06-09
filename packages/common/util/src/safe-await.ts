//
// Copyright 2024 DXOS.org
//

export const safeAwaitAll = async <T>(
  source: IterableIterator<T>,
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

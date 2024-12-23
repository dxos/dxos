//
// Copyright 2024 DXOS.org
//

// TODO(burdon): GraphBuilder.

// TODO(burdon): Move to @dxos/live-object?
export const removeElements = <T>(array: T[], predicate: (element: T, index: number) => boolean): T[] => {
  const deleted: T[] = [];
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i], i)) {
      deleted.push(...array.splice(i, 1));
    }
  }

  return deleted;
};

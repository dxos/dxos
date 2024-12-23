//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Move to live-object.
export const removeElements = <T>(array: T[], predicate: (element: T, index: number) => boolean): void => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i], i)) {
      array.splice(i, 1);
    }
  }
};

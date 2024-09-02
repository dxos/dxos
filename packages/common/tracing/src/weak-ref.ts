// Workerd does not support WeakRef

//
// Copyright 2024 DXOS.org
//

class WeakRefMock<T> {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(target: T) {
    // do nothing
  }

  deref(): T | undefined {
    return undefined;
  }
}

export const WeakRef = globalThis.WeakRef ?? WeakRefMock;

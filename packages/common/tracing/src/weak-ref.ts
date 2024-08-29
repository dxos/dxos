// Workerd does not support WeakRef

class WeakRefMock<T> {
  constructor(target: T) {
    // do nothing
  }

  deref(): T | undefined {
    return undefined;
  }
}

export const WeakRef = globalThis.WeakRef ?? WeakRefMock;

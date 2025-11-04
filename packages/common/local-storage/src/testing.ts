//
// Copyright 2024 DXOS.org
//

class MockStorage implements Storage {
  store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
}

export const createLocalStorageMock = () =>
  new Proxy(new MockStorage(), {
    ownKeys: (target) => Reflect.ownKeys(target.store),
    getOwnPropertyDescriptor: (target, prop) => {
      if (prop in target.store) {
        return {
          configurable: true,
          enumerable: true,
          value: target.store[prop as any],
          writable: true,
        };
      }

      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });

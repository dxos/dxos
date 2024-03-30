import { DiKey } from './di-key';

export class DiContainer {
  #entries = new Map<DiKey<any>, any>();

  provide<T>(key: DiKey<T>, value: T): this {
    if (DiKey.getSingletonFactory(key) != null) {
      throw new Error(`Key ${DiKey.stringify(key)} is a singleton key and cannot be provided directly`);
    }
    if (this.#entries.has(key)) {
      throw new Error(`Key ${DiKey.stringify(key)} already exists in the container`);
    }

    this.#entries.set(key, value);

    return this;
  }

  get<T>(key: DiKey<T>): T {
    const value = this.#entries.get(key);
    if (value === undefined) {
      const factory = DiKey.getSingletonFactory(key);
      if (factory != null) {
        const singletonValue = factory();
        this.#entries.set(key, singletonValue);
        return singletonValue;
      }

      throw new Error(`Key ${DiKey.stringify(key)} does not exist in the container`);
    }

    return value;
  }
}

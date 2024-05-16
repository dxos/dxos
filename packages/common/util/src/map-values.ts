//
// Copyright 2024 DXOS.org
//

export const mapValues = <T, U>(obj: Record<string, T>, fn: (value: T, key: string) => U): Record<string, U> => {
  const result: Record<string, U> = {};
  Object.keys(obj).forEach((key) => {
    result[key] = fn(obj[key], key);
  });
  return result;
};

/**
 * Recursively maps values traversing arrays and objects.
 * @param fn Function to apply to each value. Second argument is a function to recurse into the value.
 */
export const deepMapValues = (value: any, fn: (value: any, recurse: (value: any) => any) => any): any => {
  return new DeepMapper(fn).map(value);
};

class DeepMapper {
  private readonly _cyclic = new Map<any, any>();

  constructor(private readonly _fn: (value: any, recurse: (value: any) => any) => any) {}

  map(value: any): any {
    if (this._cyclic.has(value)) {
      return this._cyclic.get(value);
    }

    return this._fn(value, this._recurse);
  }

  private _recurse = (value: any) => {
    if (this._cyclic.has(value)) {
      return this._cyclic.get(value);
    }

    if (Array.isArray(value)) {
      const res = new Array(value.length);
      this._cyclic.set(value, res);
      for (let i = 0; i < value.length; i++) {
        res[i] = this.map(value[i]);
      }
      return res;
    } else if (value !== null && typeof value === 'object') {
      const res: any = {};
      this._cyclic.set(value, res);
      for (const key in value) {
        res[key] = this.map(value[key]);
      }
      return res;
    } else {
      return value;
    }
  };
}

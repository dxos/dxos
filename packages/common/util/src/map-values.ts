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
export const deepMapValues = (
  value: any,
  fn: (value: any, recurse: (value: any) => any, key: string | number | undefined) => any,
): any => new DeepMapper(fn).map(value);

class DeepMapper {
  private readonly _cyclic = new Map<any, any>();

  constructor(
    private readonly _fn: (value: any, recurse: (value: any) => any, key: string | number | undefined) => any,
  ) {}

  map(value: any): any {
    return this._map(value, undefined);
  }

  private _map(value: any, key: string | number | undefined): any {
    if (this._cyclic.has(value)) {
      return this._cyclic.get(value);
    }

    return this._fn(value, this._recurse, key);
  }

  private _recurse = (value: any) => {
    if (this._cyclic.has(value)) {
      return this._cyclic.get(value);
    }

    if (Array.isArray(value)) {
      const res = new Array(value.length);
      this._cyclic.set(value, res);
      for (let i = 0; i < value.length; i++) {
        res[i] = this._map(value[i], i);
      }
      return res;
    } else if (value !== null && typeof value === 'object') {
      const res: any = {};
      this._cyclic.set(value, res);
      for (const key in value) {
        res[key] = this._map(value[key], key);
      }
      return res;
    } else {
      return value;
    }
  };
}

/**
 * Recursively maps values traversing arrays and objects.
 * @param fn Function to apply to each value. Second argument is a function to recurse into the value.
 * Async version.
 */
export const deepMapValuesAsync = (
  value: any,
  fn: (value: any, recurse: (value: any) => Promise<any>, key: string | number | undefined) => Promise<any>,
): Promise<any> => new DeepMapperAsync(fn).map(value);

class DeepMapperAsync {
  private readonly _cyclic = new Map<any, any>();

  constructor(
    private readonly _fn: (
      value: any,
      recurse: (value: any) => Promise<any>,
      key: string | number | undefined,
    ) => Promise<any>,
  ) {}

  map(value: any): Promise<any> {
    return this._map(value, undefined);
  }

  private _map(value: any, key: string | number | undefined): Promise<any> {
    if (this._cyclic.has(value)) {
      return this._cyclic.get(value);
    }

    return this._fn(value, this._recurse, key);
  }

  private _recurse = async (value: any) => {
    if (this._cyclic.has(value)) {
      return this._cyclic.get(value);
    }

    if (Array.isArray(value)) {
      const res = new Array(value.length);
      this._cyclic.set(value, res);
      for (let i = 0; i < value.length; i++) {
        res[i] = await this._map(value[i], i);
      }
      return res;
    } else if (value !== null && typeof value === 'object') {
      const res: any = {};
      this._cyclic.set(value, res);
      for (const key in value) {
        res[key] = await this._map(value[key], key);
      }
      return res;
    } else {
      return value;
    }
  };
}

/**
 * Visits all values on an object or every item in an array.
 * No-op if the value is not an object or array.
 */
export const visitValues = (object: unknown, visitor: (value: unknown, key: string | number) => void) => {
  if (Array.isArray(object)) {
    object.forEach((item, index) => visitor(item, index));
  } else if (typeof object === 'object' && object !== null) {
    for (const [key, value] of Object.entries(object)) {
      visitor(value, key);
    }
  }
};

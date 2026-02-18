import { deepMapValues } from '@dxos/util';

interface Template {
  [key: string]: Template | undefined;
}

const PathTypeId = '~@dxos/functions-runtime/object-pattern/Path' as const;
type PathTypeId = typeof PathTypeId;

type Path<T> = {
  [PathTypeId]: PathTypeId;
  toString(): string;
};

const isPath = (value: unknown): value is Path<any> => {
  return typeof value === 'object' && value !== null && PathTypeId in value;
};

const symbolSegments = Symbol('@dxos/functions-runtime/object-pattern/segments');

type Context<T> = {
  [K in keyof T]: Context<T[K]>;
} & Path<T>;

/**
 * Typed builder for object templates.
 */
export const objectTemplate = <T>(builder: (c: Context<T>) => unknown): Template => {
  return deepMapValues(builder(makeContext([]) as Context<T>), (value, recurse) => {
    if (isPath(value)) {
      return value.toString();
    }
    if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
      return recurse(value);
    }
    return value;
  });
};

const makeContext = (segments: string[]): Context<any> => {
  const target: Path<any> = {
    [PathTypeId]: PathTypeId,
    [symbolSegments]: segments,
    toString() {
      if (segments.length === 0) {
        return '{{$}}';
      }
      return `{{${segments.join('.')}}}`;
    },
  } as any;
  return new Proxy(target, {
    get: (target, prop) => {
      if (typeof prop === 'string' && !(prop in target)) {
        return makeContext([...segments, String(prop)]);
      }
      return Reflect.get(target, prop);
    },
    set: (target, prop, value) => {
      return false;
    },
  }) as Context<any>;
};

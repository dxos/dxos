//
// Copyright 2025 DXOS.org
//

import { Schema, type SchemaAST } from 'effect';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

// This odd construct only serves one purpose: when you hover over `const x: Live<T>` you'd see `Live<T>` type.
interface _Live {}
type Live<T> = _Live & T;

const live = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
  value: Schema.Schema.Type<S>,
): Live<Schema.Schema.Type<S>> => {
  const proto = createLivePrototype(schema.ast);

  const obj = Object.create(proto);
  const cell = new MemoryCell();
  Object.defineProperty(obj, Cell, {
    enumerable: false,
    configurable: false,
    value: cell,
  });
  cell.init(schema, value);
  return obj;
};

const Cell = Symbol('system/Cell');

class MemoryCell implements Cell {
  #schema!: Schema.Schema.AnyNoContext;
  #value!: unknown;

  get #initialized() {
    return this.#schema != null;
  }

  init(schema: Schema.Schema.AnyNoContext, value: unknown): void {
    this.#schema = schema;
    this.#value = value;
  }

  get(key: keyof any): unknown {
    invariant(this.#initialized);
    return (this.#value as any)[key];
  }

  set(key: keyof any, value: unknown): void {
    invariant(this.#initialized);
    (this.#value as any)[key] = value;
  }
}

interface Cell {
  init(schema: Schema.Schema.AnyNoContext, data: unknown): void;
  get(key: keyof any): unknown;
  set(key: keyof any, value: unknown): void;
}

interface LiveProto {
  get [Cell](): Cell;
}

const livePrototypeCache = new WeakMap<SchemaAST.AST, LiveProto>();

const createLivePrototype = (ast: SchemaAST.AST) => {
  if (livePrototypeCache.has(ast)) {
    return livePrototypeCache.get(ast)!;
  }

  switch (ast._tag) {
    case 'TypeLiteral': {
      const properties: PropertyDescriptorMap = Object.fromEntries(
        ast.propertySignatures.map((prop) => {
          return [
            prop.name,
            {
              configurable: false,
              enumerable: true,
              get(this: LiveProto) {
                return this[Cell].get(prop.name);
              },
              set: prop.isReadonly
                ? undefined
                : function set(this: LiveProto, value: any) {
                    this[Cell].set(prop.name, value);
                  },
            } satisfies PropertyDescriptor,
          ];
        }),
      );

      const proto: LiveProto = {} as any; // [Cell] will be defined in the object factory.
      Object.defineProperties(proto, properties);

      if (ast.indexSignatures.length > 0) {
        throw new Error('Index signatures are not supported');
      }

      livePrototypeCache.set(ast, proto);
      return proto;
    }
    case 'TupleType': {
      throw new Error('Not implemented');
    }
    default:
      throw new TypeError(`Schema AST not supported: ${ast._tag}`);
  }
};

//
//
//

const Contact = Schema.Struct({
  name: Schema.String,
  address: Schema.optional(
    Schema.Struct({
      city: Schema.String,
      zip: Schema.String,
    }),
  ),
});

describe('Statically generated live object', () => {
  test('base props on prototypes', () => {
    const proto = {
      get foo() {
        return 'foo';
      },
    };
    Object.defineProperty(proto, 'foo', {
      configurable: false,
      value: 'foo',
    });
    Object.defineProperty(proto, 'foo', {
      configurable: false,
      value: 'foo',
    });
    const obj = Object.create(proto, {
      bar: {
        value: 'bar',
        enumerable: true,
      },
      foo: {
        value: 123,
        enumerable: true,
      },
    });

    log('obj', { obj });
  });

  test('test', () => {
    const obj = live(Contact, { name: 'Bob' });
    log('keys', { keys: Object.keys(obj) });
  });
});

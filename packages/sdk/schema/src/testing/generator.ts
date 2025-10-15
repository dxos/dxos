//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Obj, type Type } from '@dxos/echo';
import {
  type BaseObject,
  FormatEnum,
  GeneratorAnnotationId,
  type GeneratorAnnotationValue,
  type JsonSchemaType,
  Ref,
  type TypedObject,
  getSchemaReference,
  getTypename,
} from '@dxos/echo/internal';
import { type AnyLiveObject, type EchoDatabase, Filter, Query } from '@dxos/echo-db';
import { findAnnotation } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

import { type SchemaProperty, getSchemaProperties } from '../properties';

/**
 * Decouples from faker.
 */
export type ValueGenerator<T = any> = Record<string, () => T>;

const randomBoolean = (p = 0.5) => Math.random() <= p;
const randomElement = <T>(elements: T[]): T => elements[Math.floor(Math.random() * elements.length)];

export type TypeSpec = {
  type: TypedObject;
  count: number;
};

/**
 * Create sets of objects.
 */
export const createObjectFactory =
  (db: EchoDatabase, generator: ValueGenerator) =>
  async (specs: TypeSpec[]): Promise<Live<any>[]> => {
    const result: Live<any>[] = [];
    for (const { type, count } of specs) {
      try {
        const pipeline = createObjectPipeline(generator, type, { db });
        const objects = await Effect.runPromise(createArrayPipeline(count, pipeline));
        result.push(...objects);
        // NOTE: Flush so that available to other generators as refs.
        await db.flush();
      } catch (err) {
        log.catch(err);
      }
    }

    return result;
  };

/**
 * Set properties based on generator annotation.
 */
export const createProps = <S extends Schema.Schema.AnyNoContext>(
  generator: ValueGenerator,
  schema: S,
  force = false,
) => {
  return (
    data: Type.Properties<Schema.Schema.Type<S>> = {} as Type.Properties<Schema.Schema.Type<S>>,
  ): Type.Properties<Schema.Schema.Type<S>> => {
    return getSchemaProperties<S>(schema.ast).reduce<Type.Properties<Schema.Schema.Type<S>>>((obj, property) => {
      if ((obj as any)[property.name] === undefined) {
        (obj as any)[property.name] = createValue(generator, schema, property, force);
      }

      return obj;
    }, data);
  };
};

/**
 * Generate value for property.
 */
const createValue = <T extends BaseObject>(
  generator: ValueGenerator,
  schema: Schema.Schema<T>,
  property: SchemaProperty<T>,
  force = false,
): any | undefined => {
  if (property.defaultValue !== undefined) {
    return structuredClone(property.defaultValue);
  }

  // Generator value from annotation.
  const annotation = findAnnotation<GeneratorAnnotationValue>(property.ast, GeneratorAnnotationId);
  if (annotation) {
    const {
      generator: generatorName,
      probability = 0.5,
      args = [],
    } = typeof annotation === 'string' ? { generator: annotation } : annotation;
    if (!property.optional || force || randomBoolean(probability)) {
      const fn = getDeep<(...args: any[]) => any>(generator, generatorName.split('.'));
      if (!fn) {
        log.warn('unknown generator', { generatorName });
      } else {
        return fn(...args);
      }
    }
  }

  // TODO(dmaretskyi): Support generating nested objects here; or generator via type.
  if (!property.optional) {
    if (property.array) {
      return [];
    } else {
      switch (property.type) {
        case 'object':
          return {};
        default: {
          const prop = [getTypename(schema), property.name].filter(Boolean).join('.');
          throw new Error(`Required property: ${prop}:${property.type}`);
        }
      }
    }
  }
};

/**
 * Set references.
 */
export const createReferences = <T extends BaseObject>(schema: Schema.Schema<T>, db: EchoDatabase) => {
  return async (obj: T): Promise<T> => {
    for (const property of getSchemaProperties<T>(schema.ast)) {
      if (!property.optional || randomBoolean()) {
        if (property.format === FormatEnum.Ref) {
          const jsonSchema = findAnnotation<JsonSchemaType>(property.ast, SchemaAST.JSONSchemaAnnotationId);
          if (jsonSchema) {
            const { typename } = getSchemaReference(jsonSchema) ?? {};
            invariant(typename);
            // TODO(burdon): Filter.typename doesn't currently work for mutable objects.
            const { objects: allObjects } = await db.query(Query.select(Filter.everything())).run();
            const objects = allObjects.filter((obj) => getTypename(obj) === typename);
            if (objects.length) {
              const object = randomElement(objects);
              (obj as any)[property.name] = Ref.make(object);
            }
          }
        }
      }
    }

    return obj;
  };
};

export const createReactiveObject = <S extends Schema.Schema.AnyNoContext>(type: S) => {
  return (data: Type.Properties<Schema.Schema.Type<S>>) => Obj.make<S>(type, data);
};

export const addToDatabase = (db: EchoDatabase) => {
  // TODO(dmaretskyi): Fix DB types.
  return <T extends BaseObject>(obj: Live<T>): AnyLiveObject<T> => db.add(obj as any) as any;
};

export const logObject = (message: string) => (obj: any) => log.info(message, { obj });

export const createObjectArray = <T extends BaseObject>(n: number): Type.Properties<T>[] =>
  Array.from({ length: n }, () => ({}) as Type.Properties<T>);

export const createArrayPipeline = <T extends BaseObject>(
  n: number,
  pipeline: (obj: Type.Properties<T>) => Effect.Effect<Live<T>, never, never>,
) => {
  return Effect.forEach(createObjectArray<T>(n), pipeline);
};

export type CreateOptions = {
  /** Database for references. */
  db?: EchoDatabase;

  /** If true, set all optional properties, otherwise randomly set them. */
  force?: boolean;
};

/**
 * Create an object creation pipeline.
 */
export const createObjectPipeline = <T extends BaseObject>(
  generator: ValueGenerator,
  type: Schema.Schema<T>,
  { db, force }: CreateOptions,
): ((obj: Type.Properties<T>) => Effect.Effect<Live<T>, never, never>) => {
  if (!db) {
    return (obj: Type.Properties<T>) => {
      const pipeline: Effect.Effect<Live<T>> = Effect.gen(function* () {
        const withProps = createProps(generator, type, force)(obj);
        return createReactiveObject(type)(withProps);
      });

      return pipeline;
    };
  } else {
    return (obj: Type.Properties<T>) => {
      const pipeline: Effect.Effect<AnyLiveObject<any>, never, never> = Effect.gen(function* () {
        const withProps = createProps(generator, type, force)(obj);
        const liveObj = createReactiveObject(type)(withProps);
        const withRefs = yield* Effect.promise(() => createReferences(type, db)(liveObj));
        return addToDatabase(db)(withRefs);
      });

      return pipeline;
    };
  }
};

export type ObjectGenerator<T extends BaseObject> = {
  createObject: () => Live<T>;
  createObjects: (n: number) => Live<T>[];
};

// TODO(ZaymonFC): Sync generator doesn't work with db; createReferences is async and can't be invoked with `Effect.runSync`.
// TODO(dmaretskyi): Expose effect API instead of pairs of sync/async APIs.
export const createGenerator = <S extends Schema.Schema.AnyNoContext>(
  generator: ValueGenerator,
  type: S,
  options: Omit<CreateOptions, 'db'> = {},
): ObjectGenerator<Schema.Schema.Type<S>> => {
  const pipeline = createObjectPipeline(generator, type, options);

  return {
    createObject: () => Effect.runSync(pipeline({} as Type.Properties<Schema.Schema.Type<S>>)),
    createObjects: (n: number) => Effect.runSync(createArrayPipeline(n, pipeline)),
  };
};

export type AsyncObjectGenerator<T extends BaseObject> = {
  createObject: () => Promise<Live<T>>;
  createObjects: (n: number) => Promise<Live<T>[]>;
};

export const createAsyncGenerator = <T extends BaseObject>(
  generator: ValueGenerator,
  type: Schema.Schema<T>,
  options: CreateOptions = {},
): AsyncObjectGenerator<T> => {
  const pipeline = createObjectPipeline(generator, type, options);

  return {
    createObject: () => Effect.runPromise(pipeline({} as Type.Properties<T>)),
    createObjects: (n: number) => Effect.runPromise(createArrayPipeline(n, pipeline)),
  };
};

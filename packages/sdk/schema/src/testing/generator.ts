//
// Copyright 2024 DXOS.org
//

import { Effect, type Schema, SchemaAST } from 'effect';

import { type EchoDatabase, type AnyLiveObject, Query, Filter } from '@dxos/echo-db';
import {
  getSchemaReference,
  getTypename,
  type BaseObject,
  type ExcludeId,
  FormatEnum,
  GeneratorAnnotationId,
  type GeneratorAnnotationValue,
  type JsonSchemaType,
  type TypedObject,
  Ref,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { live, type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

import { getSchemaProperties, type SchemaProperty } from '../properties';
import { Obj, type Type } from '@dxos/echo';

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
  async (specs: TypeSpec[]): Promise<Map<string, Live<any>[]>> => {
    const map = new Map<string, Live<any>[]>();
    for (const { type, count } of specs) {
      try {
        const pipeline = createObjectPipeline(generator, type, { db });
        const objects = await Effect.runPromise(createArrayPipeline(count, pipeline));
        map.set(type.typename, objects);
        await db.flush();
      } catch (err) {
        log.catch(err);
      }
    }

    return map;
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
      if (obj[property.name] === undefined) {
        obj[property.name] = createValue(generator, schema, property, force);
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
    const [generatorName, probability] = typeof annotation === 'string' ? [annotation, 0.5] : annotation;
    if (!property.optional || force || randomBoolean(probability)) {
      const fn = getDeep<() => any>(generator, generatorName.split('.'));
      if (!fn) {
        log.warn('unknown generator', { generatorName });
      } else {
        return fn();
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
  return (data: Omit<Schema.Schema.Type<S>, 'id' | Type.KindId>) => Obj.make<S>(type, data);
};

export const addToDatabase = (db: EchoDatabase) => {
  return <T extends BaseObject>(obj: Live<T>): AnyLiveObject<T> => db.add(obj);
};

export const logObject = (message: string) => (obj: any) => log.info(message, { obj });

export const createObjectArray = <T extends BaseObject>(n: number): ExcludeId<T>[] =>
  Array.from({ length: n }, () => ({}) as ExcludeId<T>);

export const createArrayPipeline = <T extends BaseObject>(
  n: number,
  pipeline: (obj: ExcludeId<T>) => Effect.Effect<Live<T>, never, never>,
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
): ((obj: ExcludeId<T>) => Effect.Effect<Live<T>, never, never>) => {
  if (!db) {
    return (obj: ExcludeId<T>) => {
      const pipeline: Effect.Effect<Live<T>> = Effect.gen(function* () {
        const withProps = createProps(generator, type, force)(obj);
        return createReactiveObject(type)(withProps);
      });

      return pipeline;
    };
  } else {
    return (obj: ExcludeId<T>) => {
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
    createObject: () => Effect.runSync(pipeline({} as ExcludeId<Schema.Schema.Type<S>>)),
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
    createObject: () => Effect.runPromise(pipeline({} as ExcludeId<T>)),
    createObjects: (n: number) => Effect.runPromise(createArrayPipeline(n, pipeline)),
  };
};

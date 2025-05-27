//
// Copyright 2024 DXOS.org
//

import { type Schema, SchemaAST, Effect } from 'effect';

import { type EchoDatabase, type AnyLiveObject, Query, Filter } from '@dxos/echo-db';
import {
  FormatEnum,
  GeneratorAnnotationId,
  getSchemaReference,
  getTypename,
  type BaseObject,
  type ExcludeId,
  type JsonSchemaType,
  type TypedObject,
  Ref,
} from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { live, type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

import { getSchemaProperties } from '../properties';

/**
 * Decouples from faker.
 */
export type ValueGenerator<T = any> = Record<string, () => T>;

const randomBoolean = (p = 0.5) => Math.random() < p;
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
export const createProps = <T extends BaseObject>(
  generator: ValueGenerator,
  schema: Schema.Schema<T>,
  optional = false,
) => {
  return (data: ExcludeId<T> = {} as ExcludeId<T>): ExcludeId<T> => {
    return getSchemaProperties<T>(schema.ast).reduce<ExcludeId<T>>((obj, property) => {
      if (obj[property.name] === undefined) {
        if (!property.optional || optional || randomBoolean()) {
          const gen = findAnnotation<string>(property.ast, GeneratorAnnotationId);
          const fn = gen && getDeep<() => any>(generator, gen.split('.'));
          if (fn) {
            obj[property.name] = fn();
          } else if (!property.optional) {
            log.warn('missing generator for required property', { property, schema });
          }
        }
      }

      return obj;
    }, data);
  };
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

export const createReactiveObject = <T extends BaseObject>(type: Schema.Schema<T>) => {
  return (data: ExcludeId<T>) => live<T>(type, data);
};

export const addToDatabase = (db: EchoDatabase) => {
  return <T extends BaseObject>(obj: Live<T>): AnyLiveObject<T> => db.add(obj);
};

export const noop = (obj: any) => obj;

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
  optional?: boolean;
};

/**
 * Create an object creation pipeline.
 */
export const createObjectPipeline = <T extends BaseObject>(
  generator: ValueGenerator,
  type: Schema.Schema<T>,
  { db, optional }: CreateOptions,
): ((obj: ExcludeId<T>) => Effect.Effect<Live<T>, never, never>) => {
  if (!db) {
    return (obj: ExcludeId<T>) => {
      const pipeline: Effect.Effect<Live<T>> = Effect.gen(function* () {
        // logObject('before')(obj);
        const withProps = createProps(generator, type, optional)(obj);
        const liveObj = createReactiveObject(type)(withProps);
        // logObject('after')(liveObj);
        return liveObj;
      });

      return pipeline;
    };
  } else {
    return (obj: ExcludeId<T>) => {
      const pipeline: Effect.Effect<AnyLiveObject<any>, never, never> = Effect.gen(function* () {
        // logObject('before')(obj);
        const withProps = createProps(generator, type, optional)(obj);
        const liveObj = createReactiveObject(type)(withProps);
        const withRefs = yield* Effect.promise(() => createReferences(type, db)(liveObj));
        const dbObj = addToDatabase(db)(withRefs);
        // logObject('after')(dbObj);
        return dbObj;
      });

      return pipeline;
    };
  }
};

export type ObjectGenerator<T extends BaseObject> = {
  createObject: () => Live<T>;
  createObjects: (n: number) => Live<T>[];
};

// TODO(ZaymonFC): Sync generator doesn't work with db -- createReferences is async and
//   can't be invoked with `Effect.runSync`.
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

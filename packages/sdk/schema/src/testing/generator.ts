//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type Database, Obj, Ref, Type } from '@dxos/echo';
import {
  type AnyProperties,
  GeneratorAnnotationId,
  type GeneratorAnnotationValue,
  type JsonSchemaType,
  type TypedObject,
  getSchemaReference,
} from '@dxos/echo/internal';
import { type AnyLiveObject, Filter, Query } from '@dxos/echo-db';
import {
  type SchemaProperty,
  findAnnotation,
  getProperties,
  isArrayType,
  isNestedType,
  runAndForwardErrors,
} from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

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
  (db: Database.Database, generator: ValueGenerator) =>
  async (specs: TypeSpec[]): Promise<Live<any>[]> => {
    const result: Live<any>[] = [];
    for (const { type, count } of specs) {
      try {
        const pipeline = createObjectPipeline(generator, type, { db });
        const objects = await runAndForwardErrors(createArrayPipeline(count, pipeline));
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
    return getProperties(schema.ast).reduce<Type.Properties<Schema.Schema.Type<S>>>((obj, property) => {
      const name = property.name.toString();
      if ((obj as any)[name] === undefined && name !== 'id') {
        (obj as any)[name] = createValue(generator, schema, property, force);
      }

      return obj;
    }, data);
  };
};

/**
 * Generate value for property.
 */
const createValue = <T extends AnyProperties>(
  generator: ValueGenerator,
  schema: Schema.Schema<T>,
  property: SchemaProperty,
  force = false,
): any | undefined => {
  const defaultValue = SchemaAST.getDefaultAnnotation(property.type);
  if (Option.isSome(defaultValue)) {
    return structuredClone(defaultValue.value);
  }

  // Generator value from annotation.
  const annotation = findAnnotation<GeneratorAnnotationValue>(property.type, GeneratorAnnotationId);
  if (annotation) {
    const {
      generator: generatorName,
      probability = 0.5,
      args = [],
    } = typeof annotation === 'string' ? { generator: annotation } : annotation;
    if (!property.isOptional || force || randomBoolean(probability)) {
      const fn = getDeep<(...args: any[]) => any>(generator, generatorName.split('.'));
      if (!fn) {
        log.warn('unknown generator', { generatorName });
      } else {
        return fn(...args);
      }
    }
  }

  // TODO(dmaretskyi): Support generating nested objects here; or generator via type.
  if (!property.isOptional) {
    if (isArrayType(property.type)) {
      return [];
    } else if (isNestedType(property.type)) {
      return {};
    } else {
      const prop = [Type.getTypename(schema), property.name.toString()].filter(Boolean).join('.');
      throw new Error(`Required property: ${prop}:${property.type._tag}`);
    }
  }
};

/**
 * Set references.
 */
export const createReferences = <T extends AnyProperties>(schema: Schema.Schema<T>, db: Database.Database) => {
  return async (obj: T): Promise<T> => {
    for (const property of getProperties(schema.ast)) {
      if (!property.isOptional || randomBoolean()) {
        if (Ref.isRefType(property.type)) {
          const jsonSchema = findAnnotation<JsonSchemaType>(property.type, SchemaAST.JSONSchemaAnnotationId);
          if (jsonSchema) {
            const { typename } = getSchemaReference(jsonSchema) ?? {};
            invariant(typename);
            // TODO(burdon): Filter.typename doesn't currently work for mutable objects.
            const allObjects = await db.query(Query.select(Filter.everything())).run();
            const objects = allObjects.filter((obj) => Obj.getTypename(obj) === typename);
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

export const addToDatabase = (db: Database.Database) => {
  // TODO(dmaretskyi): Fix DB types.
  return <T extends AnyProperties>(obj: Live<T>): AnyLiveObject<T> => db.add(obj as any) as any;
};

export const logObject = (message: string) => (obj: any) => log.info(message, { obj });

export const createObjectArray = <T extends AnyProperties>(n: number): Type.Properties<T>[] =>
  Array.from({ length: n }, () => ({}) as Type.Properties<T>);

export const createArrayPipeline = <T extends AnyProperties>(
  n: number,
  pipeline: (obj: Type.Properties<T>) => Effect.Effect<Live<T>, never, never>,
) => {
  return Effect.forEach(createObjectArray<T>(n), pipeline);
};

export type CreateOptions = {
  /** Database for references. */
  db?: Database.Database;

  /** If true, set all optional properties, otherwise randomly set them. */
  force?: boolean;
};

/**
 * Create an object creation pipeline.
 */
export const createObjectPipeline = <T extends AnyProperties>(
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

export type ObjectGenerator<T extends AnyProperties> = {
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

export type AsyncObjectGenerator<T extends AnyProperties> = {
  createObject: () => Promise<Live<T>>;
  createObjects: (n: number) => Promise<Live<T>[]>;
};

export const createAsyncGenerator = <T extends AnyProperties>(
  generator: ValueGenerator,
  type: Schema.Schema<T>,
  options: CreateOptions = {},
): AsyncObjectGenerator<T> => {
  const pipeline = createObjectPipeline(generator, type, options);

  return {
    createObject: () => runAndForwardErrors(pipeline({} as Type.Properties<T>)),
    createObjects: (n: number) => runAndForwardErrors(createArrayPipeline(n, pipeline)),
  };
};

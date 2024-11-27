//
// Copyright 2024 DXOS.org
//

import { Effect, pipe } from 'effect';

import { type EchoDatabase, type ReactiveEchoObject } from '@dxos/echo-db';
import {
  create,
  getSchemaReference,
  getTypename,
  type BaseObject,
  type ExcludeId,
  FormatEnum,
  GeneratorAnnotationId,
  type JsonSchemaType,
  type ReactiveObject,
  type S,
} from '@dxos/echo-schema';
import { AST, findAnnotation } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

import { getSchemaProperties } from '../properties';

// TODO(burdon): AUDIT (@dmytro)
//  - New TypedObject syntax.
//    - Define low-level types in S.Struct (e.g., in react-table).
//  - Audit all low-level types (e.g., ReactiveObject, AbstractTypedObject, MutableObject: see echo-schema/docs).
//  - Implement basic "comment required" TODOs.

// TODO(burdon): Agent pipeline (@dmytro)
//  - Generators: https://effect.website/docs/getting-started/using-generators

// TODO(burdon): Replace echo-generator.
// TODO(burdon): Delete core/agent, experimental/agent-functions.
// TODO(burdon): Generate views, tables, and SCRIPTS/FUNCTIONS.
// TODO(burdon): Generate test documents, sketches, sheets.

/**
 * Decouples from faker.
 */
export type ValueGenerator = Record<string, () => any>;

const randomBoolean = (p = 0.5) => Math.random() < p;
const randomElement = <T>(elements: T[]): T => elements[Math.floor(Math.random() * elements.length)];

/**
 * Set properties based on generator annotation.
 */
export const createProps = <T extends BaseObject<T>>(generator: ValueGenerator, schema: S.Schema<T>) => {
  return (data: ExcludeId<T> = {} as ExcludeId<T>): ExcludeId<T> => {
    return getSchemaProperties<T>(schema.ast).reduce<ExcludeId<T>>((obj, property) => {
      if (obj[property.name] === undefined) {
        if (property.optional && randomBoolean()) {
          return obj;
        }

        const gen = findAnnotation<string>(property.ast, GeneratorAnnotationId);
        const fn = gen && getDeep<() => any>(generator, gen.split('.'));
        if (fn) {
          obj[property.name] = fn();
        } else if (!property.optional) {
          log.warn('missing generator for required property', { property });
        }
      }

      return obj;
    }, data);
  };
};

/**
 * Set references.
 */
export const createReferences = <T extends BaseObject<T>>(schema: S.Schema<T>, db: EchoDatabase) => {
  return async (obj: T): Promise<T> => {
    for (const property of getSchemaProperties<T>(schema.ast)) {
      if (property.optional && randomBoolean()) {
        return obj;
      }

      if (property.format === FormatEnum.Ref) {
        const jsonSchema = findAnnotation<JsonSchemaType>(property.ast, AST.JSONSchemaAnnotationId);
        if (jsonSchema) {
          const { typename } = getSchemaReference(jsonSchema) ?? {};
          invariant(typename);
          // TODO(burdon): Filter.typename doesn't currently work for mutable objects.
          const { objects } = await db.query((obj) => getTypename(obj) === typename).run();
          if (objects.length) {
            const object = randomElement(objects);
            (obj as any)[property.name] = object;
          }
        }
      }
    }

    return obj;
  };
};

export const createReactiveObject = <T extends BaseObject<T>>(type: S.Schema<T>) => {
  return (data: ExcludeId<T>) => create<T>(type, data);
};

export const addToDatabase = (db: EchoDatabase) => {
  return <T extends BaseObject<T>>(obj: ReactiveObject<T>): ReactiveEchoObject<T> => db.add(obj);
};

export const noop = (obj: any) => obj;

export const logObject = (message: string) => (obj: any) => log.info(message, { obj });

export const createObjectArray = <T extends BaseObject<T>>(n: number): ExcludeId<T>[] =>
  Array.from({ length: n }, () => ({}) as ExcludeId<T>);

export const createArrayPipeline = <T extends BaseObject<T>>(
  n: number,
  pipeline: (obj: ExcludeId<T>) => Effect.Effect<ReactiveObject<T>, never, never>,
) => {
  return Effect.forEach(createObjectArray<T>(n), pipeline);
};

/**
 * Create an object creation pipeline.
 * - Allows for mix of sync and async transformations.
 * - Consistent error processing.
 */
export const createObjectPipeline = <T extends BaseObject<T>>(
  generator: ValueGenerator,
  type: S.Schema<T>,
  db?: EchoDatabase,
): ((obj: ExcludeId<T>) => Effect.Effect<ReactiveObject<T>, never, never>) => {
  if (!db) {
    return (obj: ExcludeId<T>) => {
      const pipeline: Effect.Effect<ReactiveObject<T>> = pipe(
        Effect.succeed(obj),
        // Effect.tap(logObject('before')),
        Effect.map((obj) => createProps(generator, type)(obj)),
        Effect.map((obj) => createReactiveObject(type)(obj)),
        // Effect.tap(logObject('after')),
      );

      return pipeline;
    };
  } else {
    return (obj: ExcludeId<T>) => {
      const pipeline: Effect.Effect<ReactiveEchoObject<T>, never, never> = pipe(
        Effect.succeed(obj),
        // Effect.tap(logObject('before')),
        Effect.map((obj) => createProps(generator, type)(obj)),
        Effect.map((obj) => createReactiveObject(type)(obj)),
        Effect.flatMap((obj) => Effect.promise(() => createReferences(type, db)(obj))),
        Effect.map((obj) => addToDatabase(db)(obj)),
        // Effect.tap(logObject('after')),
      );

      return pipeline;
    };
  }
};

export type ObjectGenerator<T extends BaseObject<T>> = {
  createObject: () => ReactiveObject<T>;
  createObjects: (n: number) => ReactiveObject<T>[];
};

export const createGenerator = <T extends BaseObject<T>>(
  generator: ValueGenerator,
  type: S.Schema<T>,
): ObjectGenerator<T> => {
  const pipeline = createObjectPipeline(generator, type);

  return {
    createObject: () => Effect.runSync(pipeline({} as ExcludeId<T>)),
    createObjects: (n: number) => Effect.runSync(createArrayPipeline(n, pipeline)),
  };
};

export type AsyncObjectGenerator<T extends BaseObject<T>> = {
  createObject: () => Promise<ReactiveObject<T>>;
  createObjects: (n: number) => Promise<ReactiveObject<T>[]>;
};

export const createAsyncGenerator = <T extends BaseObject<T>>(
  generator: ValueGenerator,
  type: S.Schema<T>,
  db: EchoDatabase,
): AsyncObjectGenerator<T> => {
  const pipeline = createObjectPipeline(generator, type, db);

  return {
    createObject: async () => await Effect.runPromise(pipeline({} as ExcludeId<T>)),
    createObjects: async (n: number) => await Effect.runPromise(createArrayPipeline(n, pipeline)),
  };
};

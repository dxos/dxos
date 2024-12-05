//
// Copyright 2024 DXOS.org
//

import { Effect, pipe } from 'effect';

import { type EchoDatabase } from '@dxos/echo-db';
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
import { faker } from '@dxos/random';
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
 * Set properties based on generator annotation.
 */
export const createProps = <T extends BaseObject<T>>(type: S.Schema<T>) => {
  return (data: ExcludeId<T> = {} as ExcludeId<T>): ExcludeId<T> => {
    return getSchemaProperties<T>(type.ast).reduce<ExcludeId<T>>((obj, property) => {
      if (obj[property.name] === undefined) {
        if (property.optional && faker.datatype.boolean()) {
          return obj;
        }

        const gen = findAnnotation<string>(property.ast, GeneratorAnnotationId);
        const fn = gen && getDeep<() => any>({ faker }, gen.split('.'));
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
export const createReferences = <T extends BaseObject<T>>(type: S.Schema<T>, db: EchoDatabase) => {
  return async (obj: BaseObject<T>): Promise<BaseObject<T>> => {
    for (const property of getSchemaProperties<T>(type.ast)) {
      if (property.optional && faker.datatype.boolean()) {
        return obj;
      }

      if (property.format === FormatEnum.Ref) {
        const jsonSchema = findAnnotation<JsonSchemaType>(property.ast, AST.JSONSchemaAnnotationId);
        if (jsonSchema) {
          const typename = getSchemaReference(jsonSchema);
          invariant(typename);
          // TODO(burdon): Filter.typename doesn't work! Create unit test.
          const { objects } = await db.query((obj) => getTypename(obj) === typename).run();
          if (objects.length) {
            const object = faker.helpers.arrayElement(objects);
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
  return <T extends BaseObject<T>>(obj: ReactiveObject<T>) => db.add(obj);
};

export const noop = (obj: any) => obj;

export const logObject = (message: string) => (obj: any) => log.info(message, { obj });

export const createObjectArray = <T extends BaseObject<T>>(n: number): ExcludeId<T>[] =>
  Array.from({ length: n }, () => ({}) as any);

export const createArrayPipeline = <T extends BaseObject<T>>(
  n: number,
  pipeline: (obj: ExcludeId<T>) => Effect.Effect<ExcludeId<T>>,
) => {
  return Effect.forEach(createObjectArray<T>(n), pipeline);
};

/**
 * Create an object creation pipeline.
 * - Allows for mix of sync and async transformations.
 * - Consistent error processing.
 */
export const createObjectPipeline = <T extends BaseObject<T>>(type: S.Schema<T>, db?: EchoDatabase) => {
  const e1 = (obj: ExcludeId<T>) => Effect.sync(() => createProps(type)(obj));
  const e2 = (obj: ExcludeId<T>) => Effect.sync(() => createReactiveObject(type)(obj));

  if (!db) {
    return (obj: ExcludeId<T>): Effect.Effect<BaseObject<T>> => {
      return pipe(
        Effect.succeed(obj),
        // Effect.tap(logObject('before')),
        Effect.flatMap(e1),
        Effect.flatMap(e2),
        // Effect.tap(logObject('after')),
      );
    };
  } else {
    const e3 = (obj: BaseObject<T>) => Effect.promise(() => createReferences(type, db)(obj));
    const e4 = (obj: BaseObject<T>) => Effect.sync(() => addToDatabase(db)(obj));

    // TODO(burdon): Types (unify?)
    return (obj: ExcludeId<T>) => {
      return pipe(
        Effect.succeed(obj),
        // Effect.tap(logObject('before')),
        Effect.flatMap(e1),
        Effect.flatMap(e2),
        Effect.flatMap(e3),
        Effect.flatMap(e4),
        // Effect.tap(logObject('after')),
      );
    };
  }
};

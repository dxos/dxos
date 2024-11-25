//
// Copyright 2024 DXOS.org
//

import { Effect, pipe } from 'effect';

import { type EchoDatabase } from '@dxos/echo-db';
import {
  create,
  type S,
  type ReactiveObject,
  type ExcludeId,
  type BaseObject,
  FormatEnum,
  GeneratorAnnotationId,
  type JsonSchemaType,
  getSchemaReference,
  getTypename,
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
//    - Type should include definition of `id`.
//  - Audit all low-level types (e.g., ReactiveObject, AbstractTypedObject, MutableObject: see echo-schema/docs).
//  - Implement basic "comment required" TODOs.

// TODO(burdon): Agent pipeline (@dmytro)
//  - Generators: https://effect.website/docs/getting-started/using-generators/

// TODO(burdon): Replace echo-generator.
// TODO(burdon): Delete core/agent, experimental/agent-functions.
// TODO(burdon): Generate views, tables, and SCRIPTS/FUNCTIONS.
// TODO(burdon): Generate test documents, sketches, sheets.

/**
 * Set properties based on generator annotation.
 */
export const setProps = <T extends BaseObject>(type: S.Schema<T>) => {
  return (initial: ExcludeId<T> = {} as ExcludeId<T>): Effect.Effect<ExcludeId<T>> => {
    const obj = getSchemaProperties<T>(type.ast).reduce<ExcludeId<T>>((data, property) => {
      if (data[property.name] === undefined) {
        const gen = findAnnotation<string>(property.ast, GeneratorAnnotationId);
        if (gen) {
          const fn = getDeep<() => any>({ faker }, gen.split('.'));
          if (fn) {
            data[property.name] = fn() as any;
          }
        } else if (!property.optional) {
          log.warn('missing generator for required property', { property });
        }
      }

      return data;
    }, initial);

    return Effect.succeed(obj);
  };
};

/**
 * Set references.
 */
export const setReferences = <T extends BaseObject>(type: S.Schema<T>, db: EchoDatabase) => {
  return (obj: BaseObject<T>) => {
    return Effect.promise(async () => {
      for (const property of getSchemaProperties<T>(type.ast)) {
        if (property.format === FormatEnum.Ref) {
          const jsonSchema = findAnnotation<JsonSchemaType>(property.ast, AST.JSONSchemaAnnotationId);
          if (jsonSchema) {
            const typename = getSchemaReference(jsonSchema);
            invariant(typename);
            // TODO(burdon): Filter.typename doesn't work!
            const { objects } = await db.query((obj) => getTypename(obj) === typename).run();
            if (objects.length && faker.datatype.boolean()) {
              const object = faker.helpers.arrayElement(objects);
              obj[property.name] = object;
            }
          }
        }
      }

      return obj;
    });
  };
};

export const createReactiveObject = <T extends BaseObject<any>>(type: S.Schema<T>) => {
  return (data: ExcludeId<T>): Effect.Effect<BaseObject<T>> => {
    return Effect.succeed(create<T>(type, data));
  };
};

export const addToDatabase = (db: EchoDatabase) => {
  return <T extends BaseObject<any>>(obj: ReactiveObject<T>): Effect.Effect<BaseObject<T>> => {
    return Effect.succeed(db.add(obj));
  };
};

//
// Effect pipeline.
// - Allows for mix of sync and async transformations.
// - Consistent error processing.
// TODO(burdon): Pass db in context?
//

export const noop = (obj: any) => obj;

export const logObject = (message: string) => (obj: any) => log.info(message, { obj });

export const createObjectArray = <T extends BaseObject<T>>(n: number): ExcludeId<T>[] =>
  Array.from({ length: n }, () => ({}) as any);

export const createArrayPipeline = <T extends BaseObject<any>>(
  n: number,
  pipeline: (obj: ExcludeId<T>) => Effect.Effect<ExcludeId<T>>,
) => {
  return Effect.forEach(createObjectArray<T>(n), pipeline);
};

/**
 * Create an object creation pipeline.
 */
export const createObjectPipeline = <T extends BaseObject>(type: S.Schema<T>, db?: EchoDatabase) => {
  // TODO(burdon): Keep as functions and wrap with effect here?
  const f1 = setProps(type);
  const f2 = createReactiveObject(type);

  if (!db) {
    return (obj: ExcludeId<T>): Effect.Effect<BaseObject<T>> => {
      return pipe(
        Effect.succeed(obj),
        // Effect.tap(logObject('before')),
        Effect.flatMap(f1),
        Effect.flatMap(f2),
        // Effect.tap(logObject('after')),
      );
    };
  } else {
    const f3 = setReferences(type, db);
    const f4 = addToDatabase(db);

    // TODO(burdon): Types (unify?)
    return (obj: ExcludeId<T>) => {
      return pipe(
        Effect.succeed(obj),
        // Effect.tap(logObject('before')),
        Effect.flatMap(f1),
        Effect.flatMap(f2),
        Effect.flatMap(f3),
        Effect.flatMap(f4),
        // Effect.tap(logObject('after')),
      );
    };
  }
};

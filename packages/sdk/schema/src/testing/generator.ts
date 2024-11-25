//
// Copyright 2024 DXOS.org
//

import { Effect, pipe } from 'effect';

import { type EchoDatabase } from '@dxos/echo-db';
import { create, type S, type ReactiveObject, type ExcludeId, type BaseObject, FormatEnum } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
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
// TODO(burdon): Generate views, tables, and SCRIPTS/FUNCTIONS.,
// TODO(burdon): Generate test documents, sketches, sheets.

export const GeneratorAnnotationId = Symbol.for('@dxos/schema/annotation/Generator');

// TODO(burdon): Move to echo-schema?
type RawObject<T extends BaseObject> = ExcludeId<ReactiveObject<Partial<T>>>;

/**
 * Set properties based on generator annotation.
 */
export const setProps =
  <T extends BaseObject>(type: S.Schema<T>) =>
  (initial: RawObject<T> = {} as RawObject<T>): Effect.Effect<BaseObject<T>> => {
    const obj = getSchemaProperties<T>(type.ast).reduce<RawObject<T>>((data, property) => {
      if (data[property.name] === undefined) {
        const gen = findAnnotation<string>(property.prop.type, GeneratorAnnotationId);
        if (gen) {
          const fn = getDeep<() => any>({ faker }, gen.split('.'));
          if (fn) {
            data[property.name] = fn() as any;
          }
        }
      }

      return data;
    }, initial);

    return Effect.succeed(obj as BaseObject<T>);
  };

/**
 * Set references.
 */
export const setReferences =
  <T extends BaseObject>(type: S.Schema<T>, db: EchoDatabase) =>
  (obj: BaseObject<T>): Effect.Effect<BaseObject<T>> => {
    for (const property of getSchemaProperties<T>(type.ast)) {
      if (property.format === FormatEnum.Ref) {
        log.info('###', property.name);
      }
    }

    // TODO(burdon): Promise.
    return Effect.succeed(obj);
  };

export const createReactiveObject =
  <T extends BaseObject<any>>(type: S.Schema<T>) =>
  (data: RawObject<T>): Effect.Effect<BaseObject<T>> => {
    const obj = create<T>(type, data);
    return Effect.succeed(obj);
  };

export const addToDatabase =
  (db: EchoDatabase) =>
  <T extends BaseObject<any>>(obj: ReactiveObject<T>): Effect.Effect<BaseObject<T>> =>
    Effect.succeed(db.add(obj));

//
// Effect pipeline.
// - Allows for mix of sync and async transformations.
// - Consistent error processing.
// TODO(burdon): Pass db in context.
//

export const noop = (obj: any) => obj;

export const logObject = (message: string) => (obj: any) => log.info(message, { obj });

export const createObjectArray = <T extends BaseObject>(n: number) => Array.from({ length: n }, () => ({}) as T);

/**
 * Create a pipeline for the creation of an array of objects.
 */
export const createArrayPipeline = <T extends BaseObject<any>>(n: number): Effect.Effect<T[], never, never> =>
  pipe(
    Effect.succeed(createObjectArray<T>(n)),
    Effect.map((objects) => objects.map((obj) => obj)),

    // Effect(objects) =>
    //   objects.map((obj) =>
    //     pipe(
    //       Effect.succeed(obj),
    //       Effect.tap(() => {}),
    //     ),
    //   ),
    // ), // TODO(burdon): Pass in chained effect.
  );

/**
 *
 */
export const createObjectPipeline =
  <T extends BaseObject>(type: S.Schema<T>, db?: EchoDatabase) =>
  (obj: T): Effect.Effect<BaseObject<T>> =>
    pipe(
      //
      Effect.succeed(obj),
      Effect.flatMap((x) => {
        const f = setProps(type);
        return f(x);
      }),
    );

/**
 * Effect to create a typed object.
 */
// export const createObject =
//   <T extends BaseObject>(type: S.Schema<T>, db?: EchoDatabase) =>
//   (obj: RawObject<T>) =>
//     Effect.flatMap(
//       obj,

// setProps(type),
// createReactiveObject(type),
// TODO(burdon): Error.
// Effect.tap(logObject('created')),
// Effect.tap((value) => Effect.sync(() => console.log(value))),
// db ? addToDatabase(db) : noop,
// );

// db ? Effect.all([addToDatabase(db), setReferences(type, db)]) : noop,

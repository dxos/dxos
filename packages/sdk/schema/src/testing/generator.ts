//
// Copyright 2024 DXOS.org
//

import { Effect, pipe } from 'effect';

import { create, type S, type ReactiveObject, type ExcludeId, type BaseObject } from '@dxos/echo-schema';
import { findAnnotation } from '@dxos/effect';
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
// TODO(burdon): Type with address/geo; Address type.
// TODO(burdon): Generate views, tables, and SCRIPTS/FUNCTIONS.,

// TODO(burdon): Generate relational tables/views.
// TODO(burdon): Generate test documents, sketches, sheets.

export const GeneratorAnnotationId = Symbol.for('@dxos/schema/annotation/Generator');

// TODO(burdon): Move to echo-schema.
export type RawObject<T extends BaseObject = {}> = ExcludeId<ReactiveObject<Partial<T>>>;

export const updateObject =
  <T extends BaseObject = {}>(type: S.Schema<T>) =>
  (initial: RawObject<T> = {} as any as RawObject<T>): RawObject<T> => {
    return getSchemaProperties<T>(type.ast).reduce<RawObject<T>>((data, property) => {
      const gen = findAnnotation<string>(property.prop.type, GeneratorAnnotationId);
      if (gen) {
        const fn = getDeep<() => any>({ faker }, gen.split('.'));
        if (fn) {
          data[property.name] = fn() as any;
        }
      }

      return data;
    }, initial);
  };

export const createReactiveObject =
  <T extends BaseObject = {}>(type: S.Schema<T>) =>
  (data: RawObject<T>) => {
    return create<T>(type, data);
  };

export const createObjectArray = <T extends BaseObject>(n: number) =>
  Effect.succeed(Array.from({ length: n }, () => ({}) as T));

export const createObjectPipeline = <T extends RawObject>(n: number, p: (obj: T) => T) =>
  Effect.flatMap(createObjectArray<T>(n), (objects) => Effect.succeed(objects.map((obj) => pipe(obj, p))));

export const createObject =
  <T extends BaseObject>(type: S.Schema<T>) =>
  (obj: RawObject<T>) =>
    pipe(obj, updateObject(type), createReactiveObject(type));

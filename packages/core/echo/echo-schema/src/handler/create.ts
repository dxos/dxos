/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 */
// TODO(burdon): Option to return mutable object.

//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';
import type { Simplify } from 'effect/Types';

import { PublicKey } from '@dxos/keys';

import { initMeta } from './handler-meta';
import { prepareTypedTarget, TypedReactiveHandler } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';
import { getEchoObjectAnnotation } from '../annotations';
import { Expando } from '../expando';
import { createReactiveProxy, isValidProxyTarget, type ReactiveHandler } from '../proxy';
import { type ReactiveObject } from '../types';

type ExcludeId<T> = Simplify<Omit<T, 'id'>>;

// TODO(dmaretskyi): UUID v8.
const generateId = () => PublicKey.random().toHex();

// TODO(dmaretskyi): Deep mutability.
export const create: {
  <T extends {}>(obj: T): ReactiveObject<T>;
  <T extends {}>(schema: typeof Expando, obj: T): ReactiveObject<Expando>;
  <T extends {}>(schema: S.Schema<T>, obj: ExcludeId<T>): ReactiveObject<T>;
} = <T extends {}>(schemaOrObj: S.Schema<T> | T, obj?: ExcludeId<T>): ReactiveObject<T> => {
  if (obj && (schemaOrObj as any) !== Expando) {
    if (!isValidProxyTarget(obj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }
    const schema: S.Schema<T> = schemaOrObj as S.Schema<T>;
    const echoAnnotation = getEchoObjectAnnotation(schema);
    if (echoAnnotation) {
      if ('id' in (obj as any)) {
        throw new Error(
          'Provided object already has an `id` field. `id` field is reserved and will be automatically generated.',
        );
      }

      (obj as any).id = generateId();
    }

    initMeta(obj);
    prepareTypedTarget(obj as T, schema);
    return createReactiveProxy(obj, TypedReactiveHandler.instance as ReactiveHandler<any>) as ReactiveObject<T>;
  } else if (obj && (schemaOrObj as any) === Expando) {
    if (!isValidProxyTarget(obj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }

    if ('id' in (obj as any)) {
      throw new Error(
        'Provided object already has an `id` field. `id` field is reserved and will be automatically generated.',
      );
    }

    (obj as any).id = generateId();
    initMeta(obj);
    // Untyped.
    return createReactiveProxy(obj as T, UntypedReactiveHandler.instance as ReactiveHandler<any>) as ReactiveObject<T>;
  } else {
    if (!isValidProxyTarget(schemaOrObj)) {
      throw new Error('Value cannot be made into a reactive object.');
    }
    initMeta(schemaOrObj);
    // Untyped.
    return createReactiveProxy(
      schemaOrObj as T,
      UntypedReactiveHandler.instance as ReactiveHandler<any>,
    ) as ReactiveObject<T>;
  }
};

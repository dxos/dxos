//
// Copyright 2022 DXOS.org
//

import { inspect, type InspectOptionsStylized } from 'node:util';

import { devtoolsFormatter, todo, type DevtoolsFormatter } from '@dxos/debug';
import { type Reference } from '@dxos/echo-db';

import { AbstractEchoObject } from './object';
import {
  base,
  data,
  debug,
  immutable,
  meta,
  schema,
  type EchoObject,
  type ObjectMeta,
  type TypedObjectProperties,
} from './types';
import { AutomergeObject } from '../automerge';
import { type Schema } from '../proto'; // NOTE: Keep as type-import.
import { getBody, getHeader } from '../util';

export const isTypedObject = (object: unknown): object is TypedObject =>
  typeof object === 'object' && object !== null && !!(object as any)[base];

/**
 * @deprecated Temporary.
 */
export const isActualTypedObject = (object: unknown): object is TypedObject => {
  return !!(object as any)?.[base] && Object.getPrototypeOf((object as any)[base]) === TypedObject.prototype;
};

/**
 * @deprecated Temporary.
 */
export const isAutomergeObject = (object: unknown | undefined | null): object is AutomergeObject => {
  return !!(object as any)?.[base] && Object.getPrototypeOf((object as any)[base]) === AutomergeObject.prototype;
};

export type ConvertVisitors = {
  onRef?: (id: string, obj?: EchoObject) => any;
};

export const DEFAULT_VISITORS: ConvertVisitors = {
  onRef: (id, obj) => ({ '@id': id }),
};

/**
 * Helper type to disable type inference for a generic parameter.
 * @see https://stackoverflow.com/a/56688073
 */
type NoInfer<T> = [T][T extends any ? 0 : never];

//
// TypedObject
// Generic base class for strongly-typed schema-generated classes.
//

export type TypedObjectOptions = {
  schema?: Schema;
  type?: Reference;
  meta?: ObjectMeta;
  immutable?: boolean;
} & AutomergeOptions;

export type AutomergeOptions = {
  automerge?: boolean;
};

/**
 * Base class for generated document types and dynamic objects.
 *
 * We define the exported `TypedObject` type separately to have fine-grained control over the typescript type.
 * The runtime semantics should be exactly the same since this compiled down to `export const TypedObject = TypedObjectImpl`.
 */
class TypedObjectImpl<T> extends AbstractEchoObject<any> implements TypedObjectProperties {
  static [Symbol.hasInstance](instance: any) {
    return !!instance?.[base] && (isActualTypedObject(instance) || isAutomergeObject(instance));
  }

  constructor(initialProps?: T, opts?: TypedObjectOptions) {
    super({});

    if (opts?.automerge === false) {
      throw new Error('Legacy hypercore-based ECHO objects are not supported');
    }

    // Redirect to AutomergeObject by default.
    return new AutomergeObject(initialProps, opts) as any;
  }

  [inspect.custom](
    depth: number,
    options: InspectOptionsStylized,
    inspect_: (value: any, options?: InspectOptionsStylized) => string,
  ) {
    todo();
  }

  [devtoolsFormatter]: DevtoolsFormatter = {
    header: (config?: any) => getHeader(this, config),
    hasBody: () => true,
    body: () => getBody(this),
  };

  get [Symbol.toStringTag](): string {
    return todo();
  }

  get [debug](): string {
    return todo();
  }

  /**
   * Returns the schema type descriptor for the object.
   * @deprecated Use `__schema` instead.
   */
  get [schema](): Schema | undefined {
    return todo();
  }

  // TODO(burdon): Make immutable.
  get [meta](): ObjectMeta {
    return todo();
  }

  get [data](): any {
    return todo();
  }

  get [immutable](): boolean {
    return todo();
  }

  // TODO(burdon): Reconcile with inspect.
  get __info() {
    return todo();
  }

  get __meta(): ObjectMeta {
    return todo();
  }

  get __deleted(): boolean {
    return todo();
  }

  get __schema(): Schema | undefined {
    return todo();
  }

  /**
   * Fully qualified name of the object type for objects created from the schema.
   */
  get __typename(): string | undefined {
    return todo();
  }

  /**
   * Convert to JSON object. Used by `JSON.stringify`.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description
   */
  toJSON(): any {
    return todo();
  }

  /**
   * @internal
   */
  // TODO(dmaretskyi): Make public.
  _getType(): Reference | undefined {
    return todo();
  }

  /**
   * @internal
   */
  override _itemUpdate(): void {}

  override _beforeBind() {}

  /**
   * Store referenced object.
   * @internal
   */
  _linkObject(obj: EchoObject): Reference {
    return todo();
  }

  /**
   * Lookup referenced object.
   * @internal
   */
  _lookupLink(ref: Reference): EchoObject | undefined {
    return todo();
  }
}

// Set stringified name for constructor.
Object.defineProperty(TypedObjectImpl, 'name', { value: 'TypedObject' });

/**
 * Base class for generated document types and expando objects.
 */
type TypedObjectConstructor = {
  new <T extends Record<string, any> = Record<string, any>>(
    initialProps?: NoInfer<Partial<T>>,
    opts?: TypedObjectOptions,
  ): TypedObject<T>;
};

export type TypedObject<T extends Record<string, any> = Record<string, any>> = TypedObjectImpl<T> & T;

export const TypedObject: TypedObjectConstructor = TypedObjectImpl as any;

/**
 * Runtime object.
 */
type ExpandoConstructor = {
  new (initialProps?: Record<string, any>, options?: TypedObjectOptions): Expando;
};

export const Expando: ExpandoConstructor = TypedObject;

export type Expando = TypedObject;

export let mutationOverride = false;

// TODO(burdon): Document.
export const dangerouslyMutateImmutableObject = (cb: () => void) => {
  const prev = mutationOverride;
  mutationOverride = true;
  try {
    cb();
  } finally {
    mutationOverride = prev;
  }
};

//
// Copyright 2024 DXOS.org
//

import { Reference } from '@dxos/echo-protocol';
import { ObjectId, RefTypeId, type BaseObject, type Ref } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';

/**
 * Constructs a reference that points to the given object.
 */
// TODO(dmaretskyi): Should be `Ref.make` but that's not possible because of the circular dependency.
export const makeRef = <T extends BaseObject>(obj: T): Ref<T> => {
  // TODO(dmaretskyi): Extract to `getObjectDXN` function.
  const id = obj.id;
  invariant(ObjectId.isValid(id), 'Invalid object ID');
  const dxn = Reference.localObjectReference(id).toDXN();

  return new RefImpl(dxn, obj);
};

/**
 * Constructs a reference that points to the object specified by the provided DXN.
 */
// TODO(dmaretskyi): Should be `Ref.fromDXN` but that's not possible because of the circular dependency.
export const refFromDXN = (dxn: DXN): Ref<any> => {
  return new RefImpl(dxn);
};

export interface RefResolver {
  /**
   * Resolve ref synchronously from the objects in the working set.
   *
   * @param dxn
   * @param load If true the resolver should attempt to load the object from disk.
   * @param onLoad Callback to call when the object is loaded.
   */
  resolveSync(dxn: DXN, load: boolean, onLoad?: () => void): BaseObject | undefined;

  /**
   * Resolver ref asynchronously.
   */
  resolve(dxn: DXN): Promise<BaseObject | undefined>;
}

export class RefImpl<T> implements Ref<T> {
  #dxn: DXN;
  #resolver?: RefResolver = undefined;
  #signal = compositeRuntime.createSignal();

  /**
   * Target is set when the reference is created from a specific object.
   * In this case, the target might not be in the database.
   */
  #target: T | undefined = undefined;

  /**
   * Callback to issue a reactive notification when object is resolved.
   */
  #resolverCallback = () => {
    this.#signal.notifyWrite();
  };

  constructor(dxn: DXN, target?: T) {
    this.#dxn = dxn;
    this.#target = target;
  }

  /**
   * @inheritdoc
   */
  get dxn(): DXN {
    return this.#dxn;
  }

  /**
   * @inheritdoc
   */
  get target(): T | undefined {
    this.#signal.notifyRead();

    if (this.#target) {
      return this.#target;
    }

    invariant(this.#resolver, 'Resolver is not set');

    return this.#resolver.resolveSync(this.#dxn, true, this.#resolverCallback) as T | undefined;
  }

  /**
   * @inheritdoc
   */
  async load(): Promise<T> {
    invariant(this.#resolver, 'Resolver is not set');
    const obj = await this.#resolver.resolve(this.#dxn);
    if (obj == null) {
      throw new Error('Object not found');
    }
    return obj as T;
  }

  /**
   * @inheritdoc
   */
  async tryLoad(): Promise<T | undefined> {
    invariant(this.#resolver, 'Resolver is not set');
    return (await this.#resolver.resolve(this.#dxn)) as T | undefined;
  }

  /**
   * Serializes the reference to a JSON object.
   * The serialization format is compatible with the IPLD-style encoded references.
   * When a reference has a saved target (i.e. the target or object holding the reference is not in the database),
   * the target is included in the serialized object.
   */
  toJSON() {
    return {
      '/': this.#dxn.toString(),
      ...(this.#target ? { target: this.#target } : {}),
    };
  }

  toString() {
    if (this.#target) {
      return `Ref(${this.#target.toString()})`;
    }

    return `Ref(${this.#dxn.toString()})`;
  }

  [RefTypeId] = refVariance;

  /**
   * Internal method to set the resolver.
   * @internal
   */
  _setResolver(resolver: RefResolver) {
    this.#resolver = resolver;
  }

  /**
   * Internal method to get the saved target.
   * Not the same as `target` which is resolved from the resolver.
   * @internal
   */
  _getSavedTarget() {
    return this.#target;
  }
}

/**
 * Internal API for setting the reference resolver.
 */
export const setRefResolver = (ref: Ref<any>, resolver: RefResolver) => {
  invariant(ref instanceof RefImpl, 'Ref is not an instance of RefImpl');
  ref._setResolver(resolver);
};

/**
 * Internal API for getting the saved target on a reference.
 */
export const getRefSavedTarget = (ref: Ref<any>): BaseObject | undefined => {
  invariant(ref instanceof RefImpl, 'Ref is not an instance of RefImpl');
  return ref._getSavedTarget();
};

// Used to validate reference target type.
const refVariance: Ref<any>[typeof RefTypeId] = {
  _T: null as any,
};

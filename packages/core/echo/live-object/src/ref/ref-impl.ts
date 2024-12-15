import { type EncodedReference } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';
import { type BaseObject, type WithId, type Ref } from '@dxos/echo-schema';

/**
 * Constructs a reference that points to the given object.
 */
export const makeRef = <T extends BaseObject>(obj: T): Ref<T> => {
  throw new Error('Method not implemented.');
};

/**
 * Constructs a reference that points to the object specified by the provided DXN.
 */
export const refFromDXN = (dxn: DXN): Ref<any> => {
  throw new Error('Method not implemented.');
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

  constructor(dxn: DXN) {
    this.#dxn = dxn;
  }

  get dxn(): DXN {
    throw new Error('Method not implemented.');
  }

  get target(): T | undefined {
    throw new Error('Method not implemented.');
  }

  load(): Promise<T> {
    throw new Error('Method not implemented.');
  }

  tryLoad(): Promise<T | undefined> {
    throw new Error('Method not implemented.');
  }

  _setResolver(resolver: RefResolver) {
    this.#resolver = resolver;
  }
}

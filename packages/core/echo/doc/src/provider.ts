//
// Copyright 2025 DXOS.org
//

import { type AnyProperties } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';

import { type DocAccessor, type KeyPath } from './accessor';

/**
 * Supplies the concrete {@link DocAccessor} for an object. Registered by `@dxos/echo-client`; mirrors
 * the `RefResolver` dependency-inversion seam so this package stays free of echo-client internals.
 */
export interface DocAccessorProvider {
  getAccessor(obj: AnyProperties, path: KeyPath): DocAccessor;
}

let currentProvider: DocAccessorProvider | undefined;

/**
 * Registers the document-accessor provider. Called once by `@dxos/echo-client`.
 */
export const setProvider = (provider: DocAccessorProvider): void => {
  currentProvider = provider;
};

/**
 * Resolves a {@link DocAccessor} for a value within an object, agnostic to whether the object is
 * in-memory or attached to a database. Requires `@dxos/echo-client` to have registered a provider.
 */
export const createDocAccessor: {
  <T extends AnyProperties>(obj: T, path: KeyPath | keyof T): DocAccessor<T>;
} = (obj, path) => {
  invariant(currentProvider, 'DocAccessor provider is not registered (requires @dxos/echo-client).');
  return currentProvider.getAccessor(obj, Array.isArray(path) ? path : [path as string | number]);
};

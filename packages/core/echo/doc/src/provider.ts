//
// Copyright 2025 DXOS.org
//

import { type AnyProperties } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';

import * as Doc from './Doc';

/**
 * Supplies the concrete {@link Doc.Accessor} for an object. Registered by `@dxos/echo-client`; mirrors
 * the `RefResolver` dependency-inversion seam so this package stays free of echo-client internals.
 */
export interface Provider {
  getAccessor(obj: AnyProperties, path: Doc.KeyPath): Doc.Accessor;
}

let currentProvider: Provider | undefined;

/**
 * Registers the document-accessor provider. Called once by `@dxos/echo-client`.
 */
export const setProvider = (provider: Provider): void => {
  currentProvider = provider;
};

/**
 * Resolves an {@link Doc.Accessor} for a value within an object, agnostic to whether the object is
 * in-memory or attached to a database. Requires `@dxos/echo-client` to have registered a provider.
 */
export const createAccessor: {
  <T extends AnyProperties>(obj: T, path: Doc.KeyPath | keyof T): Doc.Accessor<T>;
} = (obj, path) => {
  invariant(currentProvider, 'Document accessor provider is not registered (requires @dxos/echo-client).');
  return currentProvider.getAccessor(obj, Array.isArray(path) ? path : [path as string | number]);
};

//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { type AnyProperties } from '@dxos/echo/internal';
import { getProxyTarget, isProxy } from '@dxos/echo/internal';

import { type ObjectCore } from '../core-db';
import { type ProxyTarget, symbolInternals, symbolNamespace, symbolPath } from './echo-proxy-target';

/**
 * Gets the ObjectCore from an ECHO object.
 */
export const getObjectCore = <T extends AnyProperties>(obj: T): ObjectCore => {
  const target = (obj as any as ProxyTarget)[symbolInternals];
  if (!target) {
    throw new Error('object is not an EchoObjectSchema');
  }
  return target;
};

/**
 * Checks if a proxy target is a root data object.
 */
export const isRootDataObject = (target: ProxyTarget) => {
  const path = target[symbolPath];
  if (!Array.isArray(path) || path.length > 0) {
    return false;
  }

  return target[symbolNamespace] === DATA_NAMESPACE;
};

/**
 * Checks if a value is an ECHO object.
 * Uses structural checks instead of instanceof to avoid circular dependencies.
 */
export const isEchoObject = (value: any): value is Obj.Unknown => {
  if (!isProxy(value)) {
    return false;
  }

  const target = getProxyTarget(value) as ProxyTarget | undefined;
  if (!target || !target[symbolInternals]) {
    return false;
  }

  return isRootDataObject(target);
};

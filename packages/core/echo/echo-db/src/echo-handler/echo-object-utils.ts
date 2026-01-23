//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { type Live, getProxyTarget, isLiveObject } from '@dxos/live-object';

import { type ObjectCore } from '../core-db';

import { type ProxyTarget, symbolInternals, symbolNamespace, symbolPath } from './echo-proxy-target';

/**
 * Gets the ObjectCore from an ECHO object.
 */
export const getObjectCore = <T extends AnyProperties>(obj: Live<T>): ObjectCore => {
  if (!(obj as any as ProxyTarget)[symbolInternals]) {
    throw new Error('object is not an EchoObjectSchema');
  }

  const { core } = (obj as any as ProxyTarget)[symbolInternals];
  return core;
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
export const isEchoObject = (value: any): value is Obj.Any => {
  if (!isLiveObject(value)) {
    return false;
  }

  // Check if the target has the ECHO object structure (symbolInternals with a core).
  const target = getProxyTarget(value) as ProxyTarget | undefined;
  if (!target || !target[symbolInternals] || !target[symbolInternals].core) {
    return false;
  }

  return isRootDataObject(target);
};

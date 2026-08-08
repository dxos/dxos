//
// Copyright 2026 DXOS.org
//

import { type CapabilityManager } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { Connector } from '../types';

/**
 * The registered connectors that bind objects of this type, by their `sync.targetTypename`.
 *
 * Pass this as a bindable type's `ConnectorAuthAnnotation.connectorIds` so the annotation resolves its
 * providers from the registry instead of listing them:
 *
 * ```ts
 * ConnectorAuthAnnotation.set({ connectorIds: connectorIdsForTarget, bindTarget: true })
 * ```
 *
 * That inverts the dependency. A domain type keeps no provider names, so adding a provider means
 * registering a `Connector` — no edit to the type it binds — and a third-party provider can bind a
 * built-in type without the domain plugin knowing it exists. It also removes the duplicate-constant
 * problem the literal form creates: the id lived in both the provider and the domain plugin, kept in
 * step by hand.
 */
export const connectorIdsForTarget = (
  object: Obj.Unknown,
  capabilities: CapabilityManager.CapabilityManager,
): readonly string[] => {
  const typename = Obj.getTypename(object);
  if (!typename) {
    return [];
  }

  return capabilities
    .getAll(Connector)
    .flat()
    .filter((connector) => connector.sync?.targetTypename === typename)
    .map((connector) => connector.id);
};

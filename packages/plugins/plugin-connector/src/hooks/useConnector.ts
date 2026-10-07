//
// Copyright 2026 DXOS.org
//

import * as Hooks from '@dxos/app-framework/Hooks';

import { ConnectorSpec } from '#types';

/**
 * Resolve a contributed {@link ConnectorSpec.ConnectorEntry} by stable `id`.
 */
export const useConnector = (connectorId: string | undefined): ConnectorSpec.ConnectorEntry | undefined => {
  const connectors = Hooks.useCapabilities(ConnectorSpec.Connector).flat();
  return connectorId ? connectors.find((connector) => connector.id === connectorId) : undefined;
};

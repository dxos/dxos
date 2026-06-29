//
// Copyright 2026 DXOS.org
//

import { useCapabilities } from '@dxos/app-framework/ui';

import { Connector, type ConnectorEntry } from '#types';

/**
 * Resolve a contributed {@link ConnectorEntry} by stable `id`.
 */
export const useConnector = (connectorId: string | undefined): ConnectorEntry | undefined => {
  const connectors = useCapabilities(Connector).flat();
  return connectorId ? connectors.find((connector) => connector.id === connectorId) : undefined;
};

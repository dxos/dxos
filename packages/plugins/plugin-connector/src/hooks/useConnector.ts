//
// Copyright 2026 DXOS.org
//

import { useCapabilities } from '@dxos/app-framework/ui';

import * as ConnectorSpec from '../types/ConnectorSpec';

/**
 * Resolve a contributed {@link ConnectorSpec.ConnectorEntry} by stable `id`.
 */
export const useConnector = (connectorId: string | undefined): ConnectorSpec.ConnectorEntry | undefined => {
  const connectors = useCapabilities(ConnectorSpec.Connector).flat();
  return connectorId ? connectors.find((connector) => connector.id === connectorId) : undefined;
};

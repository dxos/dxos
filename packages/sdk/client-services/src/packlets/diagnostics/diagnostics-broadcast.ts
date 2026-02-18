//
// Copyright 2024 DXOS.org
//

import type { Client } from '@dxos/protocols';

import {
  type CollectDiagnosticsBroadcastHandler,
  type CollectDiagnosticsBroadcastSender,
} from './diagnostics-collector';

export const createCollectDiagnosticsBroadcastSender = (): CollectDiagnosticsBroadcastSender => {
  return { broadcastDiagnosticsRequest: async () => undefined };
};

export const createCollectDiagnosticsBroadcastHandler = (
  _: Client.SystemService,
): CollectDiagnosticsBroadcastHandler => {
  return {
    start: () => {},
    stop: () => {},
  };
};

//
// Copyright 2024 DXOS.org
//

import { type SystemService } from '@dxos/protocols/rpc';

import {
  type CollectDiagnosticsBroadcastHandler,
  type CollectDiagnosticsBroadcastSender,
} from './diagnostics-collector';

export const createCollectDiagnosticsBroadcastSender = (): CollectDiagnosticsBroadcastSender => {
  return { broadcastDiagnosticsRequest: async () => undefined };
};

export const createCollectDiagnosticsBroadcastHandler = (_: SystemService.Handlers): CollectDiagnosticsBroadcastHandler => {
  return {
    start: () => {},
    stop: () => {},
  };
};

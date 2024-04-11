//
// Copyright 2024 DXOS.org
//
import { type SystemService } from '@dxos/protocols/proto/dxos/client/services';

import {
  type CollectDiagnosticsBroadcastSender,
  type CollectDiagnosticsBroadcastHandler,
} from './diagnostics-collector';

export const createCollectDiagnosticsBroadcastSender = (): CollectDiagnosticsBroadcastSender => {
  return { broadcastDiagnosticsRequest: async () => undefined };
};

export const createCollectDiagnosticsBroadcastHandler = (_: SystemService): CollectDiagnosticsBroadcastHandler => {
  return {
    start: () => {},
    stop: () => {},
  };
};

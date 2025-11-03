//
// Copyright 2024 DXOS.org
//

import { type SystemService } from '@dxos/protocols/proto/dxos/client/services';

import {
  type CollectDiagnosticsBroadcastHandler,
  type CollectDiagnosticsBroadcastSender,
} from './diagnostics-collector';

export const createCollectDiagnosticsBroadcastSender = (): CollectDiagnosticsBroadcastSender => ({
  broadcastDiagnosticsRequest: async () => undefined,
});

export const createCollectDiagnosticsBroadcastHandler = (_: SystemService): CollectDiagnosticsBroadcastHandler => ({
  start: () => {},
  stop: () => {},
});

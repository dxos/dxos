//
// Copyright 2022 DXOS.org
//

import { IframeService, WorkerService } from 'packages/core/protocols/proto/dxos/iframe';
import { BridgeService } from 'packages/core/protocols/proto/dxos/mesh/bridge';

import { schema } from '@dxos/protocols';
import { ServiceBundle } from '@dxos/rpc';

export type IframeServiceBundle = {
  IframeService: IframeService
  BridgeService: BridgeService
}

export const iframeServiceBundle: ServiceBundle<IframeServiceBundle> = {
  IframeService: schema.getService('dxos.iframe.IframeService'),
  BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
};

export type WorkerServiceBundle = {
  WorkerService: WorkerService
}

export const workerServiceBundle: ServiceBundle<WorkerServiceBundle> = {
  WorkerService: schema.getService('dxos.iframe.WorkerService')
};

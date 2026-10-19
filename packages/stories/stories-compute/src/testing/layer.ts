//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { type Client } from '@dxos/client';
import { ProcessManager, RemoteProcessManager, RemoteTraceMonitor, UnifiedProcessManager } from '@dxos/compute-runtime';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { EdgeProcessManager } from '@dxos/edge-compute';

export type ComputeLayerOptions = {
  /** Shared with React so handle status atoms render from the registry that updates them. */
  registry: Registry.AtomRegistry;
  /** Connect the remote manager to the client's EDGE service; otherwise `edge` requests die. */
  edge?: boolean;
  client: Client;
};

/**
 * {@link Process.ManagerService} over a local runtime and, when `edge`, the client's EDGE service.
 */
export const makeComputeLayer = ({
  registry,
  edge = false,
  client,
}: ComputeLayerOptions): Layer.Layer<Process.ManagerService> =>
  UnifiedProcessManager.layer.pipe(
    Layer.provide(ProcessManager.layer()),
    Layer.provide(edge ? EdgeProcessManager.fromClient(client) : RemoteProcessManager.layerNoop),
    Layer.provide(RemoteTraceMonitor.layerNoop),
    Layer.provide(ServiceResolver.layerRequirements()),
    Layer.provide(OperationHandlerSet.provide(OperationHandlerSet.empty)),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provide(Trace.layerNoop),
    Layer.provide(Layer.succeed(Registry.AtomRegistry, registry)),
  );

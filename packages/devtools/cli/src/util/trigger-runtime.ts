//
// Copyright 2025 DXOS.org
//

import type * as ConfigError from 'effect/Config';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import type * as Option from 'effect/Option';
import * as Path from 'effect/Path';
import type * as PlatformError from 'effect/PlatformError';
import * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { OpaqueToolkit } from '@dxos/ai';
import { ToolExecutionServices } from '@dxos/assistant';
import { type ClientService, type ConfigService } from '@dxos/client';
import { getProfilePath } from '@dxos/client-protocol';
import { DX_DATA } from '@dxos/client-protocol';
import { ProcessManager } from '@dxos/compute-runtime';
import { TriggerDispatcher, TriggerStateStore } from '@dxos/compute-runtime';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Database, type Key } from '@dxos/echo';

import { type AiChatServices, chatLayer } from './runtime.ts';
import { operationHandlers as skillOperationHandlers, toolkits } from './skills.ts';

export type TriggerRuntimeServices =
  | TriggerDispatcher
  | TriggerStateStore
  | ToolResolverService
  | ToolExecutionService
  | AiChatServices;

export type TriggerRuntimeLayerOptions = {
  spaceId: Option.Option<Key.SpaceId>;
  livePollInterval?: Duration.Duration;
  profile: string;
};

/**
 * Creates a layer for the trigger runtime that can run functions locally and schedule triggers.
 * Functions are loaded from the database, similar to how the compute runtime works.
 * This builds on top of the chat layer and adds trigger-specific services.
 */
export const triggerRuntimeLayer = ({
  spaceId,
  livePollInterval = Duration.seconds(1),
  profile,
}: TriggerRuntimeLayerOptions): Layer.Layer<
  TriggerRuntimeServices,
  ConfigError.ConfigError | PlatformError.PlatformError,
  // `Path` comes from `KeyValueStore.layerFileSystem`, which v4 moved into core effect.
  ClientService | ConfigService | FileSystem.FileSystem | Path.Path
> => {
  // Set up KeyValueStore for trigger state storage
  const kvStoreLayer = Layer.unwrap(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const storagePath = getProfilePath(DX_DATA, profile, 'trigger-state');

      // Ensure directory exists
      yield* fs.makeDirectory(storagePath, { recursive: true });

      return KeyValueStore.layerFileSystem(storagePath);
    }),
  );

  // Set up trigger state store with file system KeyValueStore
  const triggerStateStoreLayer = TriggerStateStore.layerKv.pipe(Layer.provide(kvStoreLayer));

  // Build on top of chat layer, adding trigger-specific services
  return Layer.unwrap(
    Effect.gen(function* () {
      // Use the same merged toolkit as chat.
      const toolkit = OpaqueToolkit.merge(...toolkits);

      // Use chat layer as the base (with 'edge' provider since we're using Edge AI service)
      const baseChatLayer = chatLayer({ provider: 'edge', spaceId, functions: skillOperationHandlers });

      // Add trigger-specific services on top
      // Note: Tool services use the merged toolkit, matching how ChatProcessor.execute() does it
      return TriggerDispatcher.layer({ timeControl: 'natural', livePollInterval }).pipe(
        Layer.provide(ProcessManager.layer({ runtimeName: Trace.CommonRuntimeName.local })),
        Layer.provide(ServiceResolver.layerRequirements(Database.Service, OpaqueToolkit.OpaqueToolkitProvider)),
        Layer.provide(Registry.layer),
        Layer.provideMerge(triggerStateStoreLayer),
        Layer.provideMerge(Trace.layerNoop),
        Layer.provideMerge(ToolExecutionServices),
        Layer.provideMerge(OpaqueToolkit.providerLayer(toolkit)),
        Layer.provideMerge(baseChatLayer),
        Layer.provideMerge(OperationHandlerSet.provide(skillOperationHandlers)),
        Layer.provide(KeyValueStore.layerMemory),
      );
    }),
  );
};

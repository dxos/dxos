//
// Copyright 2025 DXOS.org
//

import type * as PlatformError from '@effect/platform/Error';
import * as FileSystem from '@effect/platform/FileSystem';
import * as BunKeyValueStore from '@effect/platform-bun/BunKeyValueStore';
import type * as ConfigError from 'effect/ConfigError';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Option from 'effect/Option';

import { type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { GenericToolkit, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { type ClientService, type ConfigService } from '@dxos/client';
import { getProfilePath } from '@dxos/client-protocol';
import { DX_DATA } from '@dxos/client-protocol';
import { Database, Query } from '@dxos/echo';
import { type Key } from '@dxos/echo';
import { Function, FunctionDefinition } from '@dxos/functions';
import { InvocationTracer, TriggerDispatcher, TriggerStateStore } from '@dxos/functions-runtime';

import { functions as blueprintFunctions, toolkits } from './blueprints';
import { type AiChatServices, chatLayer } from './runtime';

export type TriggerRuntimeServices =
  | TriggerDispatcher
  | TriggerStateStore
  | ToolResolverService
  | ToolExecutionService
  | InvocationTracer
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
  ClientService | ConfigService | FileSystem.FileSystem | Database.Service
> => {
  // Set up KeyValueStore for trigger state storage
  const kvStoreLayer = Layer.unwrapEffect(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const storagePath = getProfilePath(DX_DATA, profile, 'trigger-state');

      // Ensure directory exists
      yield* fs.makeDirectory(storagePath, { recursive: true });

      return BunKeyValueStore.layerFileSystem(storagePath);
    }),
  );

  // Set up trigger state store with file system KeyValueStore
  const triggerStateStoreLayer = TriggerStateStore.layerKv.pipe(Layer.provide(kvStoreLayer));

  // Build on top of chat layer, adding trigger-specific services
  return Layer.unwrapEffect(
    Effect.gen(function* () {
      // Load functions from the database
      const functionObjects = yield* Database.Service.runQuery(Query.type(Function.Function));
      const dbFunctions = functionObjects.map((fn) => FunctionDefinition.deserialize(fn));

      // Merge database functions with blueprint functions
      const functions = [...dbFunctions, ...blueprintFunctions];

      // Use the same merged toolkit as chat (AssistantToolkit, SystemToolkit, etc.)
      const toolkit = GenericToolkit.merge(...toolkits);

      // Use chat layer as the base (with 'edge' provider since we're using Edge AI service)
      const baseChatLayer = chatLayer({ provider: 'edge', spaceId, functions });

      // Add trigger-specific services on top
      // Note: Tool services use the merged toolkit, matching how ChatProcessor.execute() does it
      return TriggerDispatcher.layer({ timeControl: 'natural', livePollInterval }).pipe(
        Layer.provideMerge(triggerStateStoreLayer),
        Layer.provideMerge(InvocationTracer.layerTest),
        Layer.provideMerge(makeToolResolverFromFunctions(functions, toolkit.toolkit)),
        Layer.provideMerge(makeToolExecutionServiceFromFunctions(toolkit.toolkit, toolkit.layer)),
        Layer.provideMerge(baseChatLayer),
      );
    }),
  );
};



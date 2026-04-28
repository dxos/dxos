//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import {
  AgentBlueprint,
  AgentBlueprintHandlers,
  AgentHandlers,
  AutomationBlueprint,
  BlueprintManagerBlueprint,
  BlueprintManagerHandlers,
  DatabaseBlueprint,
  DatabaseHandlers,
  MemoryBlueprint,
  WebSearchBlueprint,
  WebSearchHandlers,
  WebSearchToolkitOpaque,
} from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Feed, Tag } from '@dxos/echo';
import { Operation } from '@dxos/operation';

const meta = {
  id: 'dxos.org/plugin/assistant-test-fixture',
  name: 'AssistantTestFixture',
};

/**
 * Node-friendly plugin that contributes the assistant-toolkit blueprints,
 * operation handlers, toolkits and schemas needed by assistant e2e tests.
 *
 * Mirrors the declarative contributions of `plugin-assistant` without pulling
 * in its React surfaces or client-side dependencies.
 */
export const AssistantTestFixturePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'blueprint-definition',
    activatesOn: AppActivationEvents.SetupArtifactDefinition,
    activate: () =>
      Effect.succeed([
        Capability.contributes(AppCapabilities.BlueprintDefinition, BlueprintManagerBlueprint),
        Capability.contributes(AppCapabilities.BlueprintDefinition, DatabaseBlueprint),
        Capability.contributes(AppCapabilities.BlueprintDefinition, WebSearchBlueprint),
        Capability.contributes(AppCapabilities.BlueprintDefinition, MemoryBlueprint),
        Capability.contributes(AppCapabilities.BlueprintDefinition, AutomationBlueprint),
        Capability.contributes(AppCapabilities.BlueprintDefinition, AgentBlueprint),
      ]),
  }),
  Plugin.addModule({
    id: 'operation-handler',
    activatesOn: ActivationEvents.SetupOperationHandler,
    activate: () =>
      Effect.succeed([
        Capability.contributes(Capabilities.OperationHandler, AgentHandlers),
        Capability.contributes(Capabilities.OperationHandler, AgentBlueprintHandlers),
        Capability.contributes(Capabilities.OperationHandler, BlueprintManagerHandlers),
        Capability.contributes(Capabilities.OperationHandler, DatabaseHandlers),
        Capability.contributes(Capabilities.OperationHandler, WebSearchHandlers),
      ]),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: () =>
      Effect.succeed(
        Capability.contributes(AppCapabilities.Schema, [
          Blueprint.Blueprint,
          Prompt.Prompt,
          Operation.PersistentOperation,
          Feed.Feed,
          Tag.Tag,
        ]),
      ),
  }),
  Plugin.addModule({
    id: 'toolkit',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(AppCapabilities.Toolkit, WebSearchToolkitOpaque)),
  }),
  Plugin.make,
);

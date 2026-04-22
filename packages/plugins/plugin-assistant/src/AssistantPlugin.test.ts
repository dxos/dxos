//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';

import { AssistantPlugin } from './AssistantPlugin';
import { AssistantEvents } from '#types';

describe('AssistantPlugin', () => {
  //
  // Module activation tests — one per module in AssistantPlugin.tsx.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    test('blueprint-definition module contributes on SetupArtifactDefinition', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupArtifactDefinition);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition).length).toBeGreaterThan(0);
    });

    test('metadata module contributes Chat metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Chat.Chat.typename)).toBe(true);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('schema module contributes Chat.Chat on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Chat.Chat);
    });

    test('settings module contributes on SetupSettings', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.getAll(AppCapabilities.Settings).length).toBeGreaterThan(0);
    });

    // Skipped: loading the surfaces module under vitest node pulls in @atlaskit pragmatic-drag-and-drop
    // which ships raw CSS that cannot be parsed by node (Category A).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('assistant-state module activates on SetupSettings (alongside the settings module)', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.manager.getEventsFired()).toContain('org.dxos.app-framework.event.setup-settings');
    });

    test('edge + local model resolver modules activate on AssistantEvents.SetupAiServiceProviders', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [AssistantPlugin()], autoStart: false });
      await harness.fire(AssistantEvents.SetupAiServiceProviders);
      // Firing the event should complete without errors; the two modules contribute model resolvers.
      expect(harness.manager.getEventsFired()).toContain(AssistantEvents.SetupAiServiceProviders.id);
    });

    // The markdown-extension module activates on MarkdownEvents.SetupExtensions, which is fired
    // by @dxos/plugin-markdown. Without running the markdown plugin, we cannot exercise it here.
    test.skip('markdown-extension module (fired by @dxos/plugin-markdown)', () => {});

    // The on-space-created module activates on SpaceEvents.SpaceCreated, which is fired by
    // @dxos/plugin-space when a space is created. Requires the space plugin.
    test.skip('on-space-created module (fired by @dxos/plugin-space)', () => {});

    // The AiService module activates on Startup but has activatesBefore: [SetupAiServiceProviders]
    // — firing Startup would force a full activation chain including the ai service.
    test.skip('ai-service module (requires the full Startup chain)', () => {});

    // Toolkit module activates on Startup; contributes Toolkit.
    test.skip('toolkit module (requires the full Startup chain)', () => {});

    // CompanionChatProvisioner activates on allOf(OperationInvokerReady, AppGraphReady, DeckEvents.StateReady).
    test.skip('companion-chat-provisioner (requires graph, operation, deck plugins)', () => {});

    // Migrations activates on ClientEvents.SetupMigration — fired by @dxos/plugin-client.
    test.skip('migrations module (fired by @dxos/plugin-client)', () => {});
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // The end-to-end Startup activation pulls in AiService + Toolkit + full ai-service-provider chain,
    // which contacts remote services. We cover what we can per-module above; skip the full plugin test.
    test.skip('end-to-end activation (Startup triggers remote ai-service setup)', () => {});
  });
});

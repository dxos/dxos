//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import { EffectEx } from '@dxos/effect';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

import { AgentClaudePlugin } from './agent-claude-plugin.ts';

/**
 * Diagnostic for the `WithClaudeAgent` stall: activates the plugin in a bare manager — no story, no
 * client, no browser — and asserts the producer contribution is visible. Distinguishes "the plugin
 * never activates" from "activation collides with the story stack".
 */
describe('AgentClaudePlugin', () => {
  test('carries a resolvable meta and one Startup module', () => {
    expect(AgentClaudePlugin.meta.profile.key).to.eq('com.example.plugin.agentClaude');
    expect(AgentClaudePlugin.modules).to.have.length(1);
  });

  test('activating Startup contributes the turn producer', async () => {
    const manager = PluginManager.make({
      pluginLoader: () => Effect.die(new Error('not implemented')),
      plugins: [AgentClaudePlugin],
      enabled: [AgentClaudePlugin.meta.profile.key],
    });

    await EffectEx.runPromise(manager.activate(ActivationEvents.Startup));

    const producers = manager.capabilities.getAll(AssistantCapabilities.AgentTurnProducer);
    expect(producers, 'the producer was never contributed').to.have.length(1);
  });
});

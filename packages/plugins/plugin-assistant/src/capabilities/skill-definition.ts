//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import {
  AgentSkill,
  AlarmSkill,
  AutomationSkill,
  BrowserSkill,
  ChatContextSkill,
  DelegationSkill,
  MemorySkill,
  PlanningSkill,
  SkillManagerSkill,
  WebSearchSkill,
  makeDelegationStrategy,
} from '@dxos/assistant-toolkit';
import * as RegistryPlugin from '@dxos/plugin-registry/RegistryPlugin';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';

import { AssistantSkill, PluginManagerSkill } from '#skills';

const skillDefinition = Effect.fnUntraced(function* () {
  const manager = yield* Plugin.Service;
  // The plugin-manager tools resolve to handlers the registry plugin contributes, and only an
  // extensible host has one: the curated production and mobile sets ship a fixed plugin list, where
  // the skill would advertise verbs that cannot run.
  const registryPresent = manager
    .getPlugins()
    .some((plugin) => plugin.meta.profile.key === RegistryPlugin.meta.profile.key);

  return [
    Capability.contributeAll(AppCapabilities.SkillDefinition, [
      AssistantSkill,
      ...(registryPresent ? [PluginManagerSkill] : []),
      BrowserSkill,
      DatabaseSkill,
      ChatContextSkill,
      WebSearchSkill,
      AgentSkill,
      PlanningSkill,
      MemorySkill,
      AutomationSkill,
      SkillManagerSkill,
      DelegationSkill,
      AlarmSkill,
    ]),

    // Run the conversational agent as a supervisor: delegate in-progress plan tasks to sub-agents
    // and fold their results back into the conversation (consumed by the AgentService LayerSpec).
    Capability.contribute(RoutineCapabilities.AgentDelegationStrategy, makeDelegationStrategy()),
  ];
});

export default skillDefinition;

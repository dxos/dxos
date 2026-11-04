//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Reply, ReplyHandler } from '@dxos/compute/testing';
import { TestSchema } from '@dxos/echo/testing';
import { DXN } from '@dxos/keys';

export const TEST_PLUGIN_KEY = 'org.dxos.plugin.hostTest';

export const TestSkill: Skill.Definition = {
  key: 'org.dxos.skill.hostTest',
  make: () =>
    Skill.make({
      key: 'org.dxos.skill.hostTest',
      name: 'Host test',
      description: 'Exercises the plugin host.',
      mcpPrompt: true,
      tools: Skill.toolDefinitions({ operations: [Reply] }),
    }),
};

/** A plugin with no UI that contributes one type, one operation and one skill. */
export const TestPlugin = Plugin.define(Plugin.makeMeta({ key: DXN.make(TEST_PLUGIN_KEY), name: 'Host test' })).pipe(
  Plugin.addModule(AppCapability.schema([TestSchema.Person])),
  Plugin.addModule(
    Capability.inlineModule('TestOperations', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed(Capability.contribute(Capabilities.OperationHandler, OperationHandlerSet.make(ReplyHandler))),
    ),
  ),
  Plugin.addModule(
    Capability.inlineModule('TestSkill', { provides: [AppCapabilities.SkillDefinition] }, () =>
      Effect.succeed(Capability.contribute(AppCapabilities.SkillDefinition, TestSkill)),
    ),
  ),
  Plugin.make,
);

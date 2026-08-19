//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory } from '@dxos/assistant-toolkit';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Sequence } from '@dxos/conductor';
import { Feed, type Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import { type AssistantOptions } from '#types';

// The single source for the plugin's schema list, loaded lazily by every `AssistantPlugin`
// variant's schema module: these types ride heavy barrels (@dxos/assistant → @effect/ai →
// fast-check/zod) that must stay out of the definition's static closure.
const types: ReadonlyArray<Type.AnyEntity> = [
  Chat.Chat,
  Chat.CompanionTo,
  Skill.Skill,
  AiContext.Binding,
  Feed.Feed,
  HasSubject.HasSubject,
  Message.Message,
  Instructions.Instructions,
  McpServer.McpServer,
  Memory.Memory,
  Text.Text,
];

// Unfinished, so a curated build withholds them entirely — unregistered, an existing one falls to
// plugin-preview's unsupported-type notice instead of opening a half-built editor.
const experimentalTypeDefs: ReadonlyArray<Type.AnyEntity> = [Agent.Agent, Sequence.Sequence];

export default Capability.makeModule(
  Effect.fnUntraced(function* (pluginOptions: AssistantOptions.AssistantPluginOptions | void) {
    const experimentalTypes = pluginOptions?.experimentalTypes ?? true;
    return [
      Capability.contribute(AppCapabilities.Schema, experimentalTypes ? [...types, ...experimentalTypeDefs] : types),
    ];
  }),
);

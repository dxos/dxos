//
// Copyright 2026 DXOS.org
//

import { type AiContext } from '@dxos/assistant';
import * as AlarmSkill from '@dxos/assistant-toolkit/AlarmSkill';
import * as ChatContextSkill from '@dxos/assistant-toolkit/ChatContextSkill';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as SkillManagerSkill from '@dxos/assistant-toolkit/SkillManagerSkill';
import type * as Chat from '@dxos/assistant/Chat';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';

import { AssistantSkill, PluginManagerSkill } from '#skills';

/** Only an extensible host contributes the plugin-manager skill; elsewhere its tools cannot run. */
export const contributesPluginManager = (contributed: readonly Pick<Skill.Definition, 'key'>[]): boolean =>
  contributed.some(({ key }) => key === PluginManagerSkill.key);

const defaultChatSkills = (pluginManager: boolean): Ref.Ref<Skill.Skill>[] =>
  [
    AssistantSkill,
    DatabaseSkill,
    ChatContextSkill,
    SkillManagerSkill,
    AlarmSkill,
    PlanningSkill,
    ...(pluginManager ? [PluginManagerSkill] : []),
  ].map(({ key }) => Ref.fromURI(Skill.registryURI(key)));

export const bindChatDefaults = (
  binder: AiContext.Binder,
  { chat, pluginManager }: { chat: Chat.Chat; pluginManager: boolean },
): Promise<void> => binder.bind({ skills: defaultChatSkills(pluginManager), objects: [Ref.make(chat)] });

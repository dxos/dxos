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

export const defaultChatSkills = (contributed: readonly Pick<Skill.Definition, 'key'>[]): Ref.Ref<Skill.Skill>[] =>
  [
    AssistantSkill,
    DatabaseSkill,
    ChatContextSkill,
    SkillManagerSkill,
    AlarmSkill,
    PlanningSkill,
    ...(contributed.some(({ key }) => key === PluginManagerSkill.key) ? [PluginManagerSkill] : []),
  ].map(({ key }) => Ref.fromURI(Skill.registryURI(key)));

export const bindChatDefaults = (
  binder: AiContext.Binder,
  { chat, contributed }: { chat: Chat.Chat; contributed: readonly Pick<Skill.Definition, 'key'>[] },
): Promise<void> => binder.bind({ skills: defaultChatSkills(contributed), objects: [Ref.make(chat)] });

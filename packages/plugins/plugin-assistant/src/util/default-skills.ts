//
// Copyright 2026 DXOS.org
//

import * as AlarmSkill from '@dxos/assistant-toolkit/AlarmSkill';
import * as ChatContextSkill from '@dxos/assistant-toolkit/ChatContextSkill';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as SkillManagerSkill from '@dxos/assistant-toolkit/SkillManagerSkill';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';

import { AssistantSkill, PluginManagerSkill } from '#skills';

/**
 * The skills a new chat starts with, as registry refs.
 *
 * `pluginManager` only where the host contributes that skill: its tools resolve to the registry
 * plugin's handlers, so binding it elsewhere binds a skill that cannot run.
 */
export const defaultChatSkills = ({ pluginManager }: { pluginManager: boolean }): Ref.Ref<Skill.Skill>[] =>
  [
    AssistantSkill,
    DatabaseSkill,
    ChatContextSkill,
    SkillManagerSkill,
    AlarmSkill,
    // Bound by default rather than agent-enabled: the conversation's checklist is durable and invisible
    // to the model, so a chat without this skill cannot read or update the tasks it is already carrying
    // — and a model that enables it mid-turn has already answered a task question from nothing.
    PlanningSkill,
    ...(pluginManager ? [PluginManagerSkill] : []),
  ].map(({ key }) => Ref.fromURI(Skill.registryURI(key)));

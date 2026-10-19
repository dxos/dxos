//
// Copyright 2026 DXOS.org
//

import type * as SlashCommand from '@dxos/assistant-toolkit/SlashCommand';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';

/** `Planning Assistant` → `/planning-assistant`. */
export const skillCommandName = (skill: Skill.Skill): string =>
  `/${skill.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

/**
 * The ref a skill binds by: a registry skill by its key URI, so it resolves through the registry with
 * no clone; anything else (a space skill, or a fork of a registry one) by its own ref.
 */
export const skillRef = (skill: Skill.Skill): Ref.Ref<Skill.Skill> => {
  const key = Obj.getMeta(skill).key;
  return Obj.getDatabase(skill) === undefined && key !== undefined
    ? Ref.fromURI(Skill.registryURI(key))
    : Ref.make(skill);
};

/**
 * One command per skill: `/<skill>` loads it into the conversation from this turn on, and any text after
 * the command is sent as the prompt.
 */
export const makeSkillCommands = (skills: readonly Skill.Skill[]): SlashCommand.SlashCommand[] =>
  skills.map((skill) => ({
    command: skillCommandName(skill),
    description: skill.description ?? skill.name,
    execute: async (args, { binder }) => {
      if (!binder) {
        return new Error('Skills can be loaded only into a conversation.');
      }
      await binder.bind({ skills: [skillRef(skill)] });
      const prompt = args.trim();
      return {
        summary: `Loaded the ${skill.name} skill.`,
        ...(prompt.length > 0 ? { followUp: prompt } : {}),
      };
    },
  }));

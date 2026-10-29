//
// Copyright 2026 DXOS.org
//

import * as SlashCommand from '@dxos/assistant-toolkit/SlashCommand';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';

export const skillCommandName = (skill: Skill.Skill): string =>
  `/${skill.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

/** The registry key of a skill a plugin contributes, which lives in no database; undefined for a stored skill. */
const registryKey = (skill: Skill.Skill): string | undefined =>
  Obj.getDatabase(skill) === undefined ? Obj.getMeta(skill).key : undefined;

export const skillRef = (skill: Skill.Skill): Ref.Ref<Skill.Skill> => {
  const key = registryKey(skill);
  return key !== undefined ? Ref.fromURI(Skill.registryURI(key)) : Ref.make(skill);
};

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
        ...(prompt.length > 0 ? { prompt } : {}),
      };
    },
  }));

export const runDraftCommand = async (
  text: string,
  commands: readonly SlashCommand.SlashCommand[],
  context: SlashCommand.SlashCommandContext,
): Promise<string | undefined> => {
  const resolved = SlashCommand.resolveSlashCommand(text, commands);
  if (!resolved) {
    return text;
  }
  const result = await resolved.command.execute(resolved.args, context);
  if (result instanceof Error) {
    throw result;
  }
  return result.prompt;
};

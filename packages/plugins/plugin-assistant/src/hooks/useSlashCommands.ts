//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as SlashCommand from '@dxos/assistant-toolkit/SlashCommand';
import { type Database, type Registry } from '@dxos/echo';

import { AssistantCapabilities } from '#types';

import { makeSkillCommands } from '../commands/index.ts';
import { useSkills } from './useSkillRegistry.ts';

export type UseSlashCommandsProps = {
  registry?: Registry.Registry;
  db?: Database.Database;
};

/**
 * Every command the prompt offers: what plugins contribute, then one per skill. Contributed commands
 * come first, so a skill whose name matches one never shadows it.
 */
export const useSlashCommands = ({ registry, db }: UseSlashCommandsProps): SlashCommand.SlashCommand[] => {
  const contributed = Hooks.useCapabilities(AssistantCapabilities.SlashCommands);
  const skills = useSkills({ registry, db });
  return useMemo(() => [...contributed.flat(), ...makeSkillCommands(skills)], [contributed, skills]);
};

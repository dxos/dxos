//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';

import { type ResearchSource, defaultResearchSources } from '#sources';

import * as CrmOperation from '../../types/CrmOperation';
import { makeInstructions } from './instructions';

const SKILL_KEY = 'org.dxos.skill.crm';

/**
 * Factory for the CRM skill. Optionally accepts a list of registered
 * research sources whose tools are composed into the skill's tool list
 * and whose descriptions are rendered into the skill's instructions.
 */
export const makeCrmSkill = (researchSources: ReadonlyArray<ResearchSource> = defaultResearchSources) =>
  Skill.make({
    key: SKILL_KEY,
    name: 'CRM',
    description: 'Research people and organizations and produce structured Profile documents in your space.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [CrmOperation.AttachImage, ...researchSources.flatMap((source) => source.operations ?? [])],
      tools: researchSources.flatMap((source) => source.tools ?? []),
    }),
    instructions: Template.make({
      source: makeInstructions(researchSources),
    }),
  });

const make = () => makeCrmSkill();

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;

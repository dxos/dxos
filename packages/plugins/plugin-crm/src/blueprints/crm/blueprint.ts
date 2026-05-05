//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';

import { AttachImage } from '#operations';
import { defaultResearchSources, type ResearchSource } from '#sources';

import { makeInstructions } from './instructions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.crm';

/**
 * Factory for the CRM blueprint. Optionally accepts a list of registered
 * research sources whose tools are composed into the blueprint's tool list
 * and whose descriptions are rendered into the blueprint's instructions.
 */
export const makeCrmBlueprint = (researchSources: ReadonlyArray<ResearchSource> = defaultResearchSources) =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'CRM',
    description: 'Research people and organizations and produce structured Profile documents in your space.',
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({
      operations: [AttachImage, ...researchSources.flatMap((source) => source.operations ?? [])],
      tools: researchSources.flatMap((source) => source.tools ?? []),
    }),
    instructions: Template.make({
      source: makeInstructions(researchSources),
    }),
  });

const make = () => makeCrmBlueprint();

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;

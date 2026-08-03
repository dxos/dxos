//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { type ResearchSource, defaultResearchSources } from '#sources';
import { CrmOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.crm';

/**
 * Skill instructions are deliberately thin: entity shapes, dedup, and profile structure are owned
 * by the CRM operations (ProcessMailbox / ResearchPerson / ResearchOrganization), so the prose only
 * covers what the tools cannot — subject resolution and content enrichment conventions.
 */
const INSTRUCTIONS = trim`
  {{! CRM }}

  You help a user maintain a CRM in their DXOS space: Person and Organization records with linked
  markdown Profile documents.

  - Resolve your subject first: a DXN loads with the database tools; a bare email address resolves
    to the Person whose emails contain it (query before creating).
  - Prefer the CRM operations over ad-hoc object edits: "Process mailbox" extracts contacts from a
    mailbox's new messages; "Research person" / "Research organization" create or refresh the
    subject's Profile document and ProfileOf relation.
  - Deduplicate before creating: match Persons by email and Organizations by website domain; never
    overwrite existing field values with blanks.
  - Enrich Profile documents in place: extend the skeleton's sections (Overview, Details, Key
    Links, Notes, Sources) with researched content, record every contributing URL under Sources,
    and mirror it into the ProfileOf relation's sources.
  - Attach an avatar or logo with the attach-image tool when web research surfaces a good https
    candidate; failures are non-fatal.
  - Reply with a short summary and DXN references to the objects you created or updated.
`;

/**
 * Factory for the CRM skill. Optionally accepts a list of registered
 * research sources whose tools are composed into the skill's tool list.
 */
export const makeCrmSkill = (researchSources: ReadonlyArray<ResearchSource> = defaultResearchSources) =>
  Skill.make({
    key: SKILL_KEY,
    name: 'CRM',
    description: 'Research people and organizations and produce structured Profile documents in your space.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [
        CrmOperation.AttachImage,
        CrmOperation.ProcessMailbox,
        CrmOperation.ResearchPerson,
        CrmOperation.ResearchOrganization,
        ...researchSources.flatMap((source) => source.operations ?? []),
      ],
      tools: researchSources.flatMap((source) => source.tools ?? []),
    }),
    instructions: Template.make({
      source: INSTRUCTIONS,
    }),
  });

const make = () => makeCrmSkill();

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;

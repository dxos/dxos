//
// Copyright 2026 DXOS.org
//

import { Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { ArtifactAdd, ArtifactList } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.project';

const instructions = trim`
  You are working in the context of a project (its reference is bound into this chat).
  The project owns a collection of artifacts: the durable work products of this project.
  When you create an object the user asked for (a document, outline, sheet, contact, …), file it
  into the project's artifacts with the add-artifact tool so the project owns it.
  When looking for the project's existing material, list its artifacts first rather than searching
  the whole space.
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Project',
    description: "Manage a project's artifacts: file created objects and find existing ones.",
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({
      operations: [ArtifactAdd, ArtifactList],
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;

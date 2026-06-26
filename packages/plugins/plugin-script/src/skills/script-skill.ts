//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import {
  Create,
  Read,
  Update,
  Delete,
  Deploy,
  Invoke,
  InspectInvocations,
  QueryDeployedFunctions,
  InstallFunction,
} from './functions';

const SKILL_KEY = 'org.dxos.skill.script';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Script',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [
        Create,
        Read,
        Update,
        Delete,
        Deploy,
        Invoke,
        InspectInvocations,
        QueryDeployedFunctions,
        InstallFunction,
      ],
    }),
    instructions: Template.make({
      source: trim`
        You can create, read, update, and delete scripts which contain TypeScript code.
        You can deploy scripts to the Edge runtime and invoke deployed scripts.
        You can inspect the invocation history of a deployed script.
        You can query all functions deployed to the EDGE runtime and install them into the current space.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;

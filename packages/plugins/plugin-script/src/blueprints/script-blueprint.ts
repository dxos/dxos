//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
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

const BLUEPRINT_KEY = 'org.dxos.blueprint.script';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Script',
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({
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

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;

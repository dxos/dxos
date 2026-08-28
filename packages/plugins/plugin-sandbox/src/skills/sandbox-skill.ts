//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { Sandbox, SandboxOperation } from '#types';

const make = () =>
  Skill.make({
    key: Sandbox.SKILL_KEY,
    name: 'Sandbox',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [
        SandboxOperation.CreateSandbox,
        SandboxOperation.Exec,
        SandboxOperation.UploadFile,
        SandboxOperation.DownloadFile,
      ],
    }),
    instructions: Template.make({
      source: trim`
        You can create and manage sandbox environments — isolated containers for running shell commands.
        Each sandbox is persisted as an ECHO object in the space and identified by its object ID.
        You can create sandboxes, run shell commands inside them, upload files from ECHO into a sandbox,
        and download files from a sandbox back into ECHO.
        The sandbox service is lazily initialized: the container starts on first use.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: Sandbox.SKILL_KEY,
  make,
};

export default skill;

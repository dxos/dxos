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
        SandboxOperation.ExposePort,
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
        A command is cut off after five minutes unless you pass a longer \`timeout\` (milliseconds).
        A command that is cut off has not finished.
        To serve something (a static site, a dev server), start the server with \`background: true\`, which
        returns at once and leaves it running, then call ExposePort with its port for a public URL.
        A background server stops when the container sleeps after some minutes idle; start it again if its
        URL stops answering.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: Sandbox.SKILL_KEY,
  make,
};

export default skill;

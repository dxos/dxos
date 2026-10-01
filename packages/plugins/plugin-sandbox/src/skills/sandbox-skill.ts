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
        A command is cut off after five minutes unless you pass a longer \`timeout\` (milliseconds, at most
        fifteen minutes). A command that is cut off has not finished.
        To serve something (a static site, a dev server), call ExposePort with its port and the \`command\`
        that serves it, for a public URL: the service starts the server, and starts it again whenever the
        container has slept, so the URL keeps answering. \`background: true\` starts any other command that
        must outlive its call and returns at once.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: Sandbox.SKILL_KEY,
  make,
};

export default skill;

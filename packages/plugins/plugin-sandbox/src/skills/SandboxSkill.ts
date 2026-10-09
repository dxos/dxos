//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { RepositoryOperation, Sandbox, SandboxOperation } from '#types';

export const make = () =>
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
        SandboxOperation.PublishFiles,
        SandboxOperation.AttachRepository,
        RepositoryOperation.CreateRepository,
        RepositoryOperation.GetBranches,
        RepositoryOperation.GetLog,
        RepositoryOperation.GetTree,
        RepositoryOperation.ReadFile,
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
        In the desktop app, with the Local backend, you can also publish a directory of a sandbox: it is served
        read-only over HTTP on this machine, and the URL you get back is how this app loads what you built there.

        A sandbox is ephemeral: its files go when it expires. A repository is durable, so keep what you build
        in a sandbox by pushing it to a repository.
        - Create a repository, then attach it to the sandbox (or pass it when creating the sandbox). Every
          command in the sandbox then has it as a git remote named after the repository — the attach result
          says which name — and credentials for it are already configured.
        - Use plain git: \`git init\`, commit, \`git push <remote> HEAD:main\`; in a new sandbox, \`git init\`
          and \`git pull <remote> main\` to continue from where an earlier one left off. \`$DX_REPOSITORIES\` lists
          the remote names. Initialize git in the directory you mean to keep, and ignore \`node_modules\`.
        - Branches, log, list files and read file show what a repository holds without a sandbox.
        Only sandboxes on EDGE can reach repositories.
      `,
    }),
  });

export const key = Sandbox.SKILL_KEY;

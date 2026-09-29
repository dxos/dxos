//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Branches, CommitInfo, RepositoryFile, SyncResult, Tree } from '../services/RepositoryClient.ts';
import * as Repository from './Repository.ts';
import * as RepositoryService from './RepositoryService.ts';
import * as Sandbox from './Sandbox.ts';

const RepositoryRef = Ref.Ref(Repository.Repository).annotate({
  description: 'The repository object ID.',
});

const SandboxRef = Ref.Ref(Sandbox.Sandbox).annotate({
  description: 'The sandbox object ID.',
});

const RefInput = Schema.optional(Schema.String).annotate({
  description: "Branch name or full commit hash. Defaults to the repository's default branch.",
});

export const CreateRepository = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.createRepository'),
    name: 'CreateRepository',
    description:
      'Creates a git repository in the current space. Unlike a sandbox it is durable: push what a sandbox builds into it to keep it.',
    icon: 'ph--git-branch--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotate({ description: 'Display name for the repository.' }),
    description: Schema.optional(Schema.String),
    defaultBranch: Schema.optional(Schema.String).annotate({ description: 'Defaults to "main".' }),
  }),
  output: Schema.Struct({
    repositoryId: Schema.String.annotate({ description: 'The ECHO object URI of the created repository.' }),
    remote: Schema.String.annotate({ description: 'Git remote URL. Pushing to it needs the Push operation.' }),
  }),
  services: [Database.Service, RepositoryService.Service],
});

export const Push = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.pushToRepository'),
    name: 'PushToRepository',
    description:
      'Commits everything in a sandbox directory and pushes it to a branch of a repository. Initializes git in the directory if needed; node_modules is ignored.',
    icon: 'ph--upload-simple--regular',
  },
  input: Schema.Struct({
    sandbox: SandboxRef,
    repository: RepositoryRef,
    path: Schema.optional(Schema.String).annotate({
      description: 'Absolute sandbox directory to push. Defaults to /workspace.',
    }),
    branch: Schema.optional(Schema.String).annotate({
      description: "Branch to push to. Defaults to the repository's default branch.",
    }),
    message: Schema.optional(Schema.String).annotate({ description: 'Commit message.' }),
    force: Schema.optional(Schema.Boolean).annotate({
      description: 'Overwrite the branch if its history has diverged from the sandbox.',
    }),
  }),
  output: SyncResult,
  services: [Database.Service, RepositoryService.Service],
});

export const Pull = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.pullFromRepository'),
    name: 'PullFromRepository',
    description:
      'Checks a branch of a repository out into a sandbox directory, or fast-forwards it — how a new sandbox picks up work an earlier one pushed.',
    icon: 'ph--download-simple--regular',
  },
  input: Schema.Struct({
    sandbox: SandboxRef,
    repository: RepositoryRef,
    path: Schema.optional(Schema.String).annotate({
      description: 'Absolute sandbox directory to check out into. Defaults to /workspace.',
    }),
    branch: Schema.optional(Schema.String),
  }),
  output: SyncResult,
  services: [Database.Service, RepositoryService.Service],
});

export const GetBranches = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.listRepositoryBranches'),
    name: 'ListRepositoryBranches',
    description: 'Lists the branches of a repository and the commit each points at.',
    icon: 'ph--git-branch--regular',
  },
  input: Schema.Struct({ repository: RepositoryRef }),
  output: Branches,
  services: [Database.Service, RepositoryService.Service],
});

export const GetLog = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.getRepositoryLog'),
    name: 'GetRepositoryLog',
    description: 'Lists commits of a repository, newest first.',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: Schema.Struct({
    repository: RepositoryRef,
    ref: RefInput,
    limit: Schema.optional(Schema.Number).annotate({ description: 'At most 100; defaults to 30.' }),
    offset: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({ commits: Schema.Array(CommitInfo) }),
  services: [Database.Service, RepositoryService.Service],
});

export const GetTree = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.listRepositoryFiles'),
    name: 'ListRepositoryFiles',
    description: 'Lists a directory of a repository at a branch or commit.',
    icon: 'ph--tree-structure--regular',
  },
  input: Schema.Struct({
    repository: RepositoryRef,
    ref: RefInput,
    path: Schema.optional(Schema.String).annotate({ description: 'Directory path; the root when omitted.' }),
  }),
  output: Tree,
  services: [Database.Service, RepositoryService.Service],
});

export const ReadFile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.readRepositoryFile'),
    name: 'ReadRepositoryFile',
    description: 'Reads a file of a repository at a branch or commit. Binary files are returned as base64.',
    icon: 'ph--file-text--regular',
  },
  input: Schema.Struct({
    repository: RepositoryRef,
    ref: RefInput,
    path: Schema.String.annotate({ description: 'File path from the repository root.' }),
  }),
  output: RepositoryFile,
  services: [Database.Service, RepositoryService.Service],
});

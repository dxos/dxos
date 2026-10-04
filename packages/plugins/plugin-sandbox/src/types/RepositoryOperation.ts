//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Branches, CommitInfo, RepositoryFile, Tree } from '../services/RepositoryClient.ts';
import * as Repository from './Repository.ts';
import * as RepositoryService from './RepositoryService.ts';

const RefInput = Schema.optional(Schema.String).annotate({
  description: "Branch name or full commit hash. Defaults to the repository's default branch.",
});

export const CreateRepository = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.createRepository'),
    name: 'CreateRepository',
    description:
      'Creates a git repository in the current space. Unlike a sandbox it is durable: attach it to a sandbox and push what the sandbox builds into it with git.',
    icon: 'ph--git-branch--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotate({ description: 'Display name for the repository.' }),
    description: Schema.optional(Schema.String),
    defaultBranch: Schema.optional(Schema.String).annotate({ description: 'Defaults to "main".' }),
  }),
  output: Schema.Struct({
    repositoryId: Schema.String.annotate({ description: 'The ECHO object URI of the created repository.' }),
    remote: Schema.String.annotate({
      description:
        'Git remote URL on EDGE. To push, attach the repository to a sandbox and use the remote name AttachRepository returns.',
    }),
  }),
  services: [Database.Service, RepositoryService.Service],
});

export const GetBranches = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.listRepositoryBranches'),
    name: 'ListRepositoryBranches',
    description: 'Lists the branches of a repository and the commit each points at.',
    icon: 'ph--git-branch--regular',
  },
  input: Schema.Struct({
    repository: Ref.Ref(Repository.Repository).annotate({ description: 'The repository object ID.' }),
  }),
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
    repository: Ref.Ref(Repository.Repository).annotate({ description: 'The repository object ID.' }),
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
    repository: Ref.Ref(Repository.Repository).annotate({ description: 'The repository object ID.' }),
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
    repository: Ref.Ref(Repository.Repository).annotate({ description: 'The repository object ID.' }),
    ref: RefInput,
    path: Schema.String.annotate({ description: 'File path from the repository root.' }),
  }),
  output: RepositoryFile,
  services: [Database.Service, RepositoryService.Service],
});

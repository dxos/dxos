//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { File } from '@dxos/types';

import * as Repository from './Repository.ts';
import * as RepositoryService from './RepositoryService.ts';
import * as Sandbox from './Sandbox.ts';
import * as SandboxService from './SandboxService.ts';

export const CreateSandbox = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.create'),
    name: 'CreateSandbox',
    description:
      'Creates a new sandbox environment in the current space. The sandbox is a persistent isolated container.',
    icon: 'ph--terminal--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotate({
      description: 'Display name for the sandbox.',
    }),
    baseImage: Schema.optional(Schema.String).annotate({
      description: 'Base container image to use. Defaults to the service default.',
    }),
    repositories: Schema.optional(
      Schema.Array(Ref.Ref(Repository.Repository)).annotate({
        description: 'Repositories to attach: each is a git remote, named after the repository, in every command.',
      }),
    ),
  }),
  output: Schema.Struct({
    sandboxId: Schema.String.annotate({
      description: 'The ECHO object ID of the created sandbox (also used as the sandbox service ID).',
    }),
  }),
  services: [Database.Service, SandboxService.Service, RepositoryService.Service],
});

export const Exec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.exec'),
    name: 'Exec',
    description: 'Runs a shell command in the sandbox and returns stdout, stderr, and exit code.',
    icon: 'ph--terminal-window--regular',
  },
  input: Schema.Struct({
    sandbox: Ref.Ref(Sandbox.Sandbox).annotate({ description: 'The sandbox object ID.' }),
    command: Schema.String.annotate({
      description: 'Shell command to run.',
    }),
    cwd: Schema.optional(Schema.String).annotate({
      description: 'Working directory for the command (absolute path).',
    }),
    env: Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
      description:
        'Additional environment variables. Merged with env vars from the sandbox credentials field; these override on conflict.',
    }),
    // A model that quotes the number gets the number, not a schema rejection and a lost turn.
    timeout: Schema.optional(Schema.Union([Schema.Number, Schema.NumberFromString])).annotate({
      description: 'Timeout in milliseconds. Defaults to five minutes.',
    }),
  }),
  output: Schema.Struct({
    stdout: Schema.String,
    stderr: Schema.String,
    exitCode: Schema.Number,
    success: Schema.Boolean,
  }),
  services: [Database.Service, SandboxService.Service],
});

export const UploadFile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.uploadFile'),
    name: 'UploadFile',
    description: 'Uploads a file from ECHO into the sandbox filesystem.',
    icon: 'ph--upload--regular',
  },
  input: Schema.Struct({
    sandbox: Ref.Ref(Sandbox.Sandbox).annotate({ description: 'The sandbox object ID.' }),
    file: Ref.Ref(File.File).annotate({
      description: 'The ECHO File object to upload.',
    }),
    path: Schema.String.annotate({
      description: 'Absolute path in the sandbox where the file should be written.',
    }),
  }),
  output: Schema.Struct({
    path: Schema.String.annotate({
      description: 'The path where the file was written in the sandbox.',
    }),
  }),
  services: [Database.Service, SandboxService.Service],
});

export const DownloadFile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.downloadFile'),
    name: 'DownloadFile',
    description: 'Downloads a file from the sandbox filesystem into ECHO.',
    icon: 'ph--download--regular',
  },
  input: Schema.Struct({
    sandbox: Ref.Ref(Sandbox.Sandbox).annotate({ description: 'The sandbox object ID.' }),
    path: Schema.String.annotate({
      description: 'Absolute path of the file in the sandbox.',
    }),
    dest: Schema.optional(Ref.Ref(File.File)).annotate({
      description: 'Existing ECHO File object to overwrite. If omitted, a new File object is created.',
    }),
  }),
  output: Schema.Struct({
    objectId: Schema.String.annotate({
      description: 'The ECHO object ID of the File containing the downloaded content.',
    }),
  }),
  services: [Database.Service, SandboxService.Service],
});

export const PublishFiles = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.publishFiles'),
    name: 'PublishFiles',
    description:
      'Serves a directory of a local sandbox read-only over HTTP on this machine and returns its base URL, so this app can load what a command built there, such as a plugin manifest. Desktop app only.',
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    sandbox: Ref.Ref(Sandbox.Sandbox).annotate({ description: 'The sandbox object ID.' }),
    path: Schema.String.annotate({
      description: 'Directory in the sandbox to serve, relative to its workspace (or under /workspace).',
    }),
  }),
  output: Schema.Struct({
    url: Schema.String.annotate({
      description: 'Base URL of the directory, ending in "/"; append a file path inside it. Empty when it failed.',
    }),
    error: Schema.optional(Schema.String).annotate({
      description: 'Why the directory could not be served; set iff url is empty.',
    }),
  }),
  services: [Database.Service, SandboxService.Service],
});

export const AttachRepository = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.attachRepository'),
    name: 'AttachRepository',
    description:
      'Attaches a repository to a sandbox. Every later command in the sandbox then has it as a git remote, so plain git (clone, pull, commit, push) moves work between the sandbox and the repository.',
    icon: 'ph--git-branch--regular',
  },
  input: Schema.Struct({
    sandbox: Ref.Ref(Sandbox.Sandbox).annotate({ description: 'The sandbox object ID.' }),
    repository: Ref.Ref(Repository.Repository).annotate({ description: 'The repository object ID.' }),
  }),
  output: Schema.Struct({
    remote: Schema.String.annotate({
      description: 'The git remote name commands in the sandbox address the repository by.',
    }),
  }),
  services: [Database.Service, SandboxService.Service, RepositoryService.Service],
});

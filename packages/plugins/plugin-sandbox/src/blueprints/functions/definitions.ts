//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { File } from '@dxos/types';

import * as Sandbox from '../../types/Sandbox';

const SandboxRef = Ref.Ref(Sandbox.Sandbox).annotations({
  description: 'The sandbox object ID.',
});

export const CreateSandbox = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.sandbox.create'),
    name: 'CreateSandbox',
    description:
      'Creates a new sandbox environment in the current space. The sandbox is a persistent isolated container.',
    icon: 'ph--terminal--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotations({
      description: 'Display name for the sandbox.',
    }),
    baseImage: Schema.optional(Schema.String).annotations({
      description: 'Base container image to use. Defaults to the service default.',
    }),
  }),
  output: Schema.Struct({
    sandboxId: Schema.String.annotations({
      description: 'The ECHO object ID of the created sandbox (also used as the sandbox service ID).',
    }),
  }),
  services: [Database.Service, ClientService],
});

export const Exec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.sandbox.exec'),
    name: 'Exec',
    description: 'Runs a shell command in the sandbox and returns stdout, stderr, and exit code.',
    icon: 'ph--terminal-window--regular',
  },
  input: Schema.Struct({
    sandbox: SandboxRef,
    command: Schema.String.annotations({
      description: 'Shell command to run.',
    }),
    cwd: Schema.optional(Schema.String).annotations({
      description: 'Working directory for the command (absolute path).',
    }),
    env: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })).annotations({
      description: 'Additional environment variables.',
    }),
    timeout: Schema.optional(Schema.Number).annotations({
      description: 'Timeout in milliseconds.',
    }),
  }),
  output: Schema.Struct({
    stdout: Schema.String,
    stderr: Schema.String,
    exitCode: Schema.Number,
    success: Schema.Boolean,
  }),
  services: [Database.Service, ClientService],
});

export const UploadFile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.sandbox.uploadFile'),
    name: 'UploadFile',
    description: 'Uploads a file from ECHO into the sandbox filesystem.',
    icon: 'ph--upload--regular',
  },
  input: Schema.Struct({
    sandbox: SandboxRef,
    file: Ref.Ref(File.File).annotations({
      description: 'The ECHO File object to upload.',
    }),
    path: Schema.String.annotations({
      description: 'Absolute path in the sandbox where the file should be written.',
    }),
  }),
  output: Schema.Struct({
    path: Schema.String.annotations({
      description: 'The path where the file was written in the sandbox.',
    }),
  }),
  services: [Database.Service, ClientService],
});

export const DownloadFile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.sandbox.downloadFile'),
    name: 'DownloadFile',
    description: 'Downloads a file from the sandbox filesystem into ECHO.',
    icon: 'ph--download--regular',
  },
  input: Schema.Struct({
    sandbox: SandboxRef,
    path: Schema.String.annotations({
      description: 'Absolute path of the file in the sandbox.',
    }),
    dest: Schema.optional(Ref.Ref(File.File)).annotations({
      description: 'Existing ECHO File object to overwrite. If omitted, a new File object is created.',
    }),
  }),
  output: Schema.Struct({
    objectId: Schema.String.annotations({
      description: 'The ECHO object ID of the File containing the downloaded content.',
    }),
  }),
  services: [Database.Service, ClientService],
});

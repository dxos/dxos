//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { File } from '@dxos/types';

import * as Sandbox from './Sandbox.ts';
import * as SandboxService from './SandboxService.ts';

const SandboxRef = Ref.Ref(Sandbox.Sandbox).annotate({
  description: 'The sandbox object ID.',
});

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
  }),
  output: Schema.Struct({
    sandboxId: Schema.String.annotate({
      description: 'The ECHO object ID of the created sandbox (also used as the sandbox service ID).',
    }),
  }),
  services: [Database.Service, SandboxService.Service],
});

export const Exec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.exec'),
    name: 'Exec',
    description: 'Runs a shell command in the sandbox and returns stdout, stderr, and exit code.',
    icon: 'ph--terminal-window--regular',
  },
  input: Schema.Struct({
    sandbox: SandboxRef,
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
    background: Schema.optional(Schema.Boolean).annotate({
      description:
        'Start the command and return at once without its output, leaving it running — for a server. EDGE sandboxes only.',
    }),
  }),
  output: Schema.Struct({
    stdout: Schema.String,
    stderr: Schema.String,
    exitCode: Schema.Number,
    success: Schema.Boolean,
    processId: Schema.optional(Schema.String).annotate({
      description: 'Id of the process a background command started.',
    }),
  }),
  services: [Database.Service, SandboxService.Service],
});

export const ExposePort = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.sandbox.exposePort'),
    name: 'ExposePort',
    description:
      'Publishes a port the sandbox listens on at a public HTTPS URL that a browser can load without credentials, with CORS for any origin. EDGE sandboxes only.',
    icon: 'ph--globe--regular',
  },
  input: Schema.Struct({
    sandbox: SandboxRef,
    port: Schema.Union([Schema.Number, Schema.NumberFromString])
      .check(
        Schema.isInt(),
        Schema.isBetween({ minimum: 1024, maximum: 65535 }),
        // The container's own control plane answers on 3000; the service refuses to expose it.
        Schema.makeFilter((port: number) => port !== 3000, { message: 'Port 3000 is reserved.' }),
      )
      .annotate({
        description: 'Port a process in the sandbox listens on: 1024-65535, except 3000.',
      }),
    command: Schema.optional(Schema.String).annotate({
      description:
        'Command that serves the port, e.g. a static file server. The service starts it if it is not running and again whenever the container has restarted, so the URL keeps working after the sandbox sleeps.',
    }),
    cwd: Schema.optional(Schema.String).annotate({ description: 'Working directory of `command`.' }),
  }),
  output: Schema.Struct({
    url: Schema.String.annotate({
      description: 'Public URL of the port, ending in `/`; append a path to reach a file the server serves.',
    }),
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
    sandbox: SandboxRef,
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
    sandbox: SandboxRef,
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

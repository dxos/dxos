//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import { CodeProject, Spec } from '#types';

export const VerifySpec = Operation.make({
  meta: {
    key: 'org.dxos.function.code.verify-spec',
    name: 'Verify Spec',
    description: 'Lints and structurally validates a DEUS spec.',
  },
  input: Schema.Struct({
    spec: Ref.Ref(Spec.Spec).annotations({ description: 'The Spec to verify.' }),
  }),
  output: Schema.Struct({
    ok: Schema.Boolean,
    messages: Schema.Array(Schema.String),
  }),
  services: [Database.Service],
});

export const RunBuildAgent = Operation.make({
  meta: {
    key: 'org.dxos.function.code.run-build-agent',
    name: 'Run Build Agent',
    description: 'Dispatches a build of a CodeProject via the EDGE build service.',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotations({
      description: 'The CodeProject to build.',
    }),
  }),
  output: Schema.Struct({
    status: Schema.Literal('queued', 'running', 'succeeded', 'failed'),
  }),
  services: [Database.Service],
});

const FileEntry = Schema.Struct({
  path: Schema.String,
  size: Schema.Number,
});

export const ListFiles = Operation.make({
  meta: {
    key: 'org.dxos.function.code.list-files',
    name: 'List Files',
    description: 'List the source files in a CodeProject.',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotations({
      description: 'The CodeProject to list files in.',
    }),
  }),
  output: Schema.Struct({
    files: Schema.Array(FileEntry),
  }),
  services: [Database.Service],
});

export const ReadFile = Operation.make({
  meta: {
    key: 'org.dxos.function.code.read-file',
    name: 'Read File',
    description: 'Read the content of a single source file in a CodeProject.',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotations({
      description: 'The CodeProject containing the file.',
    }),
    path: Schema.String.annotations({
      description: 'POSIX-style path of the file to read (e.g. "src/plugin.ts").',
    }),
  }),
  output: Schema.Struct({
    path: Schema.String,
    content: Schema.String,
  }),
  services: [Database.Service],
});

export const WriteFile = Operation.make({
  meta: {
    key: 'org.dxos.function.code.write-file',
    name: 'Write File',
    description:
      'Create or overwrite a source file in a CodeProject. Whole-file write; use for new files or full rewrites.',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotations({
      description: 'The CodeProject to write to.',
    }),
    path: Schema.String.annotations({
      description: 'POSIX-style path of the file to write.',
    }),
    content: Schema.String.annotations({
      description: 'New file content.',
    }),
  }),
  output: Schema.Struct({
    path: Schema.String,
    created: Schema.Boolean,
  }),
  services: [Database.Service],
});

export const DeleteFile = Operation.make({
  meta: {
    key: 'org.dxos.function.code.delete-file',
    name: 'Delete File',
    description: 'Remove a source file from a CodeProject.',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotations({
      description: 'The CodeProject to remove the file from.',
    }),
    path: Schema.String.annotations({
      description: 'POSIX-style path of the file to delete.',
    }),
  }),
  output: Schema.Struct({
    path: Schema.String,
    deleted: Schema.Boolean,
  }),
  services: [Database.Service],
});

export const ScaffoldProject = Operation.make({
  meta: {
    key: 'org.dxos.function.code.scaffold',
    name: 'Scaffold Project',
    description: 'Seed a CodeProject with a minimal Composer plugin scaffold (package.json, src/plugin.ts, README.md).',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotations({
      description: 'The CodeProject to scaffold into.',
    }),
    name: Schema.optional(
      Schema.String.annotations({
        description: 'Package name to use in the scaffolded files. Defaults to the project name.',
      }),
    ),
  }),
  output: Schema.Struct({
    files: Schema.Array(FileEntry),
  }),
  services: [Database.Service],
});

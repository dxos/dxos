//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Spec from '@dxos/compute/Spec';
import { Database, DXN, Ref } from '@dxos/echo';
import * as GitHubCapabilities from '@dxos/plugin-github/GitHubCapabilities';
// `Repo` is referenced in the emitted .d.ts of the spec-file operations (via the FileMapping schemas);
// importing it lets TypeScript name it (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Repo } from '@dxos/types';

import * as CodeProject from './CodeProject.ts';

export const VerifySpec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.verifySpec'),
    name: 'Verify Spec',
    description: 'Lints and structurally validates a DEUS spec.',
    icon: 'ph--check-circle--regular',
  },
  input: Schema.Struct({
    spec: Ref.Ref(Spec.Spec).annotate({ description: 'The Spec to verify.' }),
  }),
  output: Schema.Struct({
    ok: Schema.Boolean,
    messages: Schema.Array(Schema.String),
  }),
  services: [Database.Service],
});

export const RunBuildAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.runBuildAgent'),
    name: 'Run Build Agent',
    description: 'Dispatches a build of a CodeProject via the EDGE build service.',
    icon: 'ph--lightning--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject to build.',
    }),
  }),
  output: Schema.Struct({
    status: Schema.Literals(['queued', 'running', 'succeeded', 'failed']),
  }),
  services: [Database.Service],
});

const FileEntry = Schema.Struct({
  path: Schema.String,
  size: Schema.Number,
});

export const ListFiles = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.listFiles'),
    name: 'List Files',
    description: 'List the source files in a CodeProject.',
    icon: 'ph--list--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
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
    key: DXN.make('org.dxos.operation.code.readFile'),
    name: 'Read File',
    description: 'Read the content of a single source file in a CodeProject.',
    icon: 'ph--file-text--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject containing the file.',
    }),
    path: Schema.String.annotate({
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
    key: DXN.make('org.dxos.operation.code.writeFile'),
    name: 'Write File',
    description:
      'Create or overwrite a source file in a CodeProject. Whole-file write; use for new files or full rewrites.',
    icon: 'ph--pencil--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject to write to.',
    }),
    path: Schema.String.annotate({
      description: 'POSIX-style path of the file to write.',
    }),
    content: Schema.String.annotate({
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
    key: DXN.make('org.dxos.operation.code.deleteFile'),
    name: 'Delete File',
    description: 'Remove a source file from a CodeProject.',
    icon: 'ph--trash--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject to remove the file from.',
    }),
    path: Schema.String.annotate({
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
    key: DXN.make('org.dxos.operation.code.scaffold'),
    name: 'Scaffold Project',
    description: 'Seed a CodeProject with a minimal Composer plugin scaffold (package.json, src/plugin.ts, README.md).',
    icon: 'ph--folder-plus--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject to scaffold into.',
    }),
    name: Schema.optional(
      Schema.String.annotate({
        description: 'Package name to use in the scaffolded files. Defaults to the project name.',
      }),
    ),
  }),
  output: Schema.Struct({
    files: Schema.Array(FileEntry),
  }),
  services: [Database.Service],
});

export const HelloWorld = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.writeHelloWorld'),
    name: 'Hello World',
    description:
      'Sanity-check operation: writes (or overwrites) a single `src/hello.ts` file containing a Hello World program. ' +
      'Useful for end-to-end verification that the agent can manipulate the file abstraction.',
    icon: 'ph--hand-waving--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject to write the file into.',
    }),
  }),
  output: Schema.Struct({
    path: Schema.String,
    created: Schema.Boolean,
  }),
  services: [Database.Service],
});

export const ResetProject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.reset'),
    name: 'Reset Project',
    description: 'Delete every source file in a CodeProject. Destructive; intended for testing.',
    icon: 'ph--arrow-counter-clockwise--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject to clear.',
    }),
  }),
  output: Schema.Struct({
    removed: Schema.Number,
  }),
  services: [Database.Service],
});

const Diagnostic = Schema.Struct({
  path: Schema.optional(Schema.String),
  line: Schema.optional(Schema.Number),
  column: Schema.optional(Schema.Number),
  severity: Schema.Literals(['error', 'warning']),
  code: Schema.optional(Schema.Number),
  message: Schema.String,
});

const BuildEntry = Schema.Struct({
  path: Schema.String,
  source: Schema.String,
});

export const BuildProject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.buildProject'),
    name: 'Build Project',
    description:
      "Compile the project's TypeScript sources in-browser. Returns language-service diagnostics plus the " +
      'emitted JavaScript for the entry file (src/hello.ts if present, else src/plugin.ts).',
    icon: 'ph--lightning--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject to build.',
    }),
  }),
  output: Schema.Struct({
    ok: Schema.Boolean,
    diagnostics: Schema.Array(Diagnostic),
    entry: Schema.optional(BuildEntry),
  }),
  services: [Database.Service],
});

export const RunBuild = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.runBuild'),
    name: 'Run Build',
    description:
      'Build the project and, on a clean build, execute the emitted entry script inside a console-capturing ' +
      'sandbox. Captures console.log/warn to stdout and console.error plus thrown errors to stderr.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(CodeProject.CodeProject).annotate({
      description: 'The CodeProject to build and run.',
    }),
  }),
  output: Schema.Struct({
    ok: Schema.Boolean,
    stdout: Schema.Array(Schema.String),
    stderr: Schema.Array(Schema.String),
    diagnostics: Schema.Array(Diagnostic),
  }),
  services: [Database.Service],
});

export const ImportSpec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.importSpec'),
    name: 'Import Spec',
    description:
      'Links a spec in a local checkout to a Spec object, keyed `github:<owner>/<repo>/<path>`; the spec then syncs ' +
      'both ways with the file. Returns the existing Spec when one already carries the key.',
    icon: 'ph--download-simple--regular',
  },
  input: Schema.Struct({
    key: Schema.String.annotate({
      description: 'The spec location, e.g. `github:dxos/dxos/packages/core/echo/echo/SPEC.mdl`.',
    }),
  }),
  output: Schema.Struct({
    spec: Ref.Ref(Spec.Spec),
    created: Schema.Boolean,
  }),
  services: [Database.Service, Capability.Service],
});

export const ListLocalSpecs = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.listLocalSpecs'),
    name: 'List Local Specs',
    description: 'Lists the `.mdl` specs in every local checkout spec sync knows, as `github:` keys.',
    icon: 'ph--folder-open--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    roots: Schema.Array(Schema.Struct({ repo: Schema.String, path: Schema.String })),
    keys: Schema.Array(Schema.String),
  }),
  services: [Capability.Service],
});

/**
 * `GitHubCapabilities.FileMapping.import` for `.mdl` files (plugin-github spec/FILE-SYNC.mdl F-6):
 * creates a Spec for a new file, or applies the remote change to its content as of the last sync.
 */
export const ImportSpecFile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.importSpecFile'),
    name: 'Import Spec File',
    description: 'Creates a Spec from a synced repository file, or merges a remote change into it.',
    icon: 'ph--download-simple--regular',
  },
  input: GitHubCapabilities.FileImportInput,
  output: GitHubCapabilities.FileImportOutput,
  services: [Capability.Service, Database.Service],
});

/** `GitHubCapabilities.FileMapping.export` for `.mdl` files: the Spec's content as it stands. */
export const ExportSpecFile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.exportSpecFile'),
    name: 'Export Spec File',
    description: 'Renders a Spec as the content of its synced repository file.',
    icon: 'ph--upload-simple--regular',
  },
  input: GitHubCapabilities.FileExportInput,
  output: GitHubCapabilities.FileExportOutput,
  services: [Capability.Service, Database.Service],
});

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import * as GitHubCapabilities from '@dxos/plugin-github/GitHubCapabilities';
import { Text } from '@dxos/schema';
// `Repo` is referenced in the emitted .d.ts of the spec-file operations (via the FileMapping schemas);
// importing it lets TypeScript name it (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Repo, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import * as CodeProject from './CodeProject.ts';
import * as Showcase from './Showcase.ts';
import * as SpecItem from './SpecItem.ts';

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

export const CreateSpecReview = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.createSpecReview'),
    name: 'Create spec review',
    icon: 'ph--seal-check--regular',
    description: trim`
      Records a compliance review of a spec from its \`.review.mdl\` text: front matter with \`commit\`, \`date\` and
      \`by\`, a summary, then one \`verdict\` block per spec item. A review with the same commit, date and reviewer as
      an existing one replaces it; any other is added to the spec's reviews.
    `,
  },
  services: [Database.Service],
  types: [Spec.Spec, SpecReview.SpecReview],
  input: Schema.Struct({
    spec: Ref.Ref(Spec.Spec).annotate({ description: 'The reviewed spec.' }),
    content: Schema.String.annotate({ description: 'The review as `.review.mdl` text.' }),
  }),
  output: Schema.Struct({
    review: Ref.Ref(SpecReview.SpecReview),
    created: Schema.Boolean,
  }),
}).pipe(Operation.mutation('write'));

/** Writes every feature object of the space into its spec as a `feat` block; a space already folded is left alone. */
export const MigrateFeatures = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.migrateFeatures'),
    name: 'Migrate Features',
    description: trim`
      Folds the space's feature objects into their specs' text as \`feat\` blocks, moving comments, task links,
      showcases, canvas positions and breakdown specs onto the spec and the block's key. Safe to run again.
    `,
    icon: 'ph--arrows-in-line-vertical--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({}),
  output: Schema.Struct({
    specs: Schema.Number,
    features: Schema.Number,
    relations: Schema.Number,
    threads: Schema.Number,
  }),
}).pipe(Operation.mutation('write'));

/**
 * \`GitHubCapabilities.FileMapping.import\` for \`.review.mdl\` files: records the review against the Spec synced from
 * the file beside it (\`PLUGIN.review.mdl\` reviews \`PLUGIN.mdl\`).
 */
export const ImportSpecReviewFile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.importSpecReviewFile'),
    name: 'Import Spec Review File',
    description: 'Records a synced repository review file as a review of the Spec synced from the file beside it.',
    icon: 'ph--seal-check--regular',
  },
  input: GitHubCapabilities.FileImportInput,
  output: GitHubCapabilities.FileImportOutput,
  services: [Database.Service],
});

/**
 * Every type the spec operations touch. Declared on the operations (`types`) as well as in the plugin's schema
 * capability, because a host that imports the handler set without activating the plugin (the EDGE operation-service
 * behind MCP) registers only what the operations declare.
 */
export const SPEC_ITEM_TYPES = [
  Project.Project,
  Showcase.Demonstrates,
  Spec.Spec,
  SpecItem.Implements,
  Task.Task,
  Text.Text,
];

const ITEM = "The key of the spec's block, as GetSpecBlocks reports it, or its label (F-3).";

export const CreateSpec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.createSpec'),
    name: 'Create spec',
    icon: 'ph--blueprint--regular',
    description: trim`
      Creates a spec: .mdl text describing what a product area should reach, added to a project's specs when one is
      given. Pass breaks to make the spec that breaks one of a spec's features down: it joins the specs of the project
      owning that spec, and the feature's spec field cites it. A feature that already cites a spec returns that one.
      Pass the dialects whose blocks the text uses; a breakdown takes the software dialects when none are given.
    `,
  },
  services: [Database.Service],
  types: SPEC_ITEM_TYPES,
  input: Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    dialects: Schema.optional(
      Schema.Array(Schema.String).annotate({ description: 'Ids of the dialect specs whose blocks the text uses.' }),
    ),
    project: Schema.optional(Ref.Ref(Project.Project)),
    breaks: Schema.optional(
      Schema.Struct({ spec: Ref.Ref(Spec.Spec), item: Schema.String.annotate({ description: ITEM }) }).annotate({
        description: 'The feature the spec breaks down.',
      }),
    ),
  }),
  output: Schema.Struct({ spec: Type.getSchema(Spec.Spec) }),
}).pipe(Operation.mutation('write'));

export const UpdateSpec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.updateSpec'),
    name: 'Update spec',
    icon: 'ph--pencil-simple--regular',
    description:
      "Changes a spec's name, description or the project that owns it; fields left out are kept, and a null project releases it.",
  },
  services: [Database.Service],
  types: [Spec.Spec, Project.Project],
  input: Schema.Struct({
    spec: Ref.Ref(Spec.Spec),
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    project: Schema.optional(Schema.NullOr(Ref.Ref(Project.Project))),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

export const LinkTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.linkTask'),
    name: 'Link task to feature',
    icon: 'ph--link--regular',
    description: trim`
      Records that a task is work toward a spec's feature. Do this when you pick up a task that moves a feature, so
      the spec's board shows the work. A task may move several features. Linking twice is a no-op.
    `,
  },
  services: [Database.Service],
  types: SPEC_ITEM_TYPES,
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
    spec: Ref.Ref(Spec.Spec),
    item: Schema.String.annotate({ description: ITEM }),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

export const CreateShowcase = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.createShowcase'),
    name: 'Create showcase',
    icon: 'ph--presentation--regular',
    description: trim`
      Creates a showcase: a slide deck that is the evidence that a feature works or a task is done. Its first slide
      is content, markdown saying what you showed and how to reproduce it; each object in artifacts (screenshots
      and videos you uploaded as files, diagrams, the pull requests the work landed in) becomes a further slide
      that shows it. Pass every task it demonstrates in targets, and every spec feature in items.
    `,
  },
  services: [Database.Service],
  // The deck's own types are plugin-presenter's, which implements this operation; it depends on this plugin.
  types: SPEC_ITEM_TYPES,
  input: Schema.Struct({
    name: Schema.String,
    content: Schema.String.annotate({ description: 'Markdown for the first slide.' }),
    targets: Schema.optional(
      Schema.Array(Ref.Ref(Obj.Unknown)).annotate({ description: 'The tasks and other objects it demonstrates.' }),
    ),
    items: Schema.optional(
      Schema.Array(
        Schema.Struct({
          spec: Ref.Ref(Spec.Spec),
          item: Schema.String.annotate({ description: "The key of the spec's block, as GetSpecBlocks reports it." }),
        }),
      ).annotate({ description: 'The spec features it demonstrates.' }),
    ),
    artifacts: Schema.optional(
      Schema.Array(Ref.Ref(Obj.Unknown)).annotate({
        description: 'Files, diagrams, pull requests and other evidence, one slide each, in order.',
      }),
    ),
  }),
  output: Schema.Struct({ showcase: Obj.Unknown }),
}).pipe(Operation.mutation('write'));

/** Edits the project's `Repo.RepositoriesAnnotation`, which no generic object write reaches. */
export const UpdateProjectRepositories = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.updateProjectRepositories'),
    name: 'Update Project Repositories',
    description:
      "Add repositories to a project's repositories or remove them, and return the list. A cloud coding agent " +
      'checks the list out and works in the first one. With neither `add` nor `remove`, returns the list unchanged.',
    icon: 'ph--git-branch--regular',
  },
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({ description: 'The project (its reference is in the chat context).' }),
    add: Schema.optional(
      Schema.Array(Ref.Ref(Repo.Repo)).annotate({
        description: 'Repositories to append, in order; one already listed keeps its place.',
      }),
    ),
    remove: Schema.optional(Schema.Array(Ref.Ref(Repo.Repo)).annotate({ description: 'Repositories to remove.' })),
  }),
  output: Schema.Struct({
    repositories: Schema.Array(Ref.Ref(Repo.Repo)).annotate({ description: "The project's repositories, in order." }),
  }),
  services: [Database.Service],
}).pipe(Operation.mutation('write'));

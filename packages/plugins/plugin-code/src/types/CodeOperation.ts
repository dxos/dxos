//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import * as GitHubCapabilities from '@dxos/plugin-github/GitHubCapabilities';
import { Text } from '@dxos/schema';
// `Repo` is referenced in the emitted .d.ts of the spec-file operations (via the FileMapping schemas);
// importing it lets TypeScript name it (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Repo, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import * as CodeProject from './CodeProject.ts';
import * as Feature from './Feature.ts';
import * as FeatureLink from './FeatureLink.ts';
import * as Showcase from './Showcase.ts';

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

/**
 * Every type a spec's features touch. Declared on the operations (`types`) as well as in the plugin's schema
 * capability, because a host that imports the handler set without activating the plugin — the EDGE
 * operation-service behind MCP — registers only what the operations declare.
 */
export const FEATURE_TYPES = [
  Feature.Feature,
  Feature.DependsOn,
  Feature.Implements,
  Spec.Spec,
  Project.Project,
  Showcase.Demonstrates,
  Task.Task,
  Text.Text,
];

/** Adding the dependency would close a cycle; the message names the features on it. */
export class DependencyCycleError extends BaseError.extend(
  'DependencyCycleError',
  'The dependency would make the features depend on themselves.',
) {}

/** The target spec breaks down the feature itself or one of its subfeatures. */
export class SpecCycleError extends BaseError.extend(
  'SpecCycleError',
  'A feature cannot move into its own spec or the spec of one of its subfeatures.',
) {}

/** A feature owns the spec, so no project can. */
export class BreakdownSpecError extends BaseError.extend(
  'BreakdownSpecError',
  'A spec that breaks down a feature belongs to that feature, not to a project.',
) {}

/** The input names neither a spec nor a feature to place the result under. */
export class NoSpecError extends BaseError.extend('NoSpecError', 'Pass a spec or a parent feature.') {}

const DESCRIPTION =
  'One or two short sentences: the ideal, what the feature does when complete, in the present tense. Not its current state.';

const SPECS = 'The spec blocks the requirements came from, e.g. packages/plugins/plugin-inbox/PLUGIN.mdl#F-3.';

const SPEC = 'The spec whose map lists the feature.';

const PARENT =
  "Places the feature in this feature's own spec, which breaks it down; the spec is made when the parent has none.";

export const CreateFeature = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.createFeature'),
    name: 'Create feature',
    icon: 'ph--puzzle-piece--regular',
    description: trim`
      Creates a feature: a goal state the product should reach, such as "Compose & send works against Gmail".
      Pass a spec to list it on that spec's map, or a parent to make it a subfeature of another feature (it lands on
      the parent's own spec). Write the description as the ideal (what the feature does when complete, present tense),
      never its current state. Give it requirements: one testable statement each. To build features from a spec's
      text, use the import-spec-features operation instead, which extracts them from its feat and req blocks.
    `,
  },
  services: [Database.Service],
  types: [Feature.Feature, Spec.Spec],
  input: Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String.annotate({ description: DESCRIPTION })),
    requirements: Schema.optional(Schema.Array(Feature.Requirement)),
    status: Schema.optional(Feature.Status.annotate({ description: 'Defaults to planned.' })),
    key: Schema.optional(
      DXN.NameSchema.annotate({
        description:
          "The feature's meta.key, a dotted name such as network.dxos.team.features.mcp.codeMode. Code cites the feature as dxn:<key>#<mnemonic>.",
      }),
    ),
    specs: Schema.optional(Schema.Array(Schema.String).annotate({ description: SPECS })),
    spec: Schema.optional(Ref.Ref(Spec.Spec).annotate({ description: SPEC })),
    parent: Schema.optional(Ref.Ref(Feature.Feature).annotate({ description: PARENT })),
  }),
  output: Schema.Struct({ feature: Type.getSchema(Feature.Feature) }),
}).pipe(Operation.mutation('write'));

export const UpdateFeature = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.updateFeature'),
    name: 'Update feature',
    icon: 'ph--pencil-simple--regular',
    description: trim`
      Changes a feature's key, name, description, requirements or status, or moves it to another spec; fields left out
      are kept. Requirements replace the whole list when given. A spec moves the feature onto that spec's map, which
      may be another spec's or a feature's own; a move into the feature's own breakdown is refused.
      Status says how far the feature has come, not whether anyone is working on it (that is read from its linked
      tasks): planned until it works, prototype when it works in a demo, operational when people can rely on it,
      failing when it worked before and does not now.
    `,
  },
  services: [Database.Service],
  types: [Feature.Feature, Spec.Spec],
  input: Schema.Struct({
    feature: Ref.Ref(Feature.Feature),
    key: Schema.optional(
      Schema.NullOr(DXN.NameSchema).annotate({ description: "Sets the feature's meta.key; null removes it." }),
    ),
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String.annotate({ description: DESCRIPTION })),
    requirements: Schema.optional(Schema.Array(Feature.Requirement)),
    status: Schema.optional(Feature.Status),
    specs: Schema.optional(Schema.Array(Schema.String).annotate({ description: SPECS })),
    spec: Schema.optional(Ref.Ref(Spec.Spec).annotate({ description: 'Moves the feature onto this spec.' })),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

export const DeleteFeature = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.deleteFeature'),
    name: 'Delete feature',
    icon: 'ph--trash--regular',
    description: trim`
      Deletes a feature, taking it off its spec's map. Its own spec, and every feature that breaks it down, go with it.
    `,
  },
  services: [Database.Service],
  types: [Feature.Feature, Spec.Spec],
  input: Schema.Struct({ feature: Ref.Ref(Feature.Feature) }),
  output: Schema.Void,
}).pipe(Operation.mutation('destructive'));

export const CreateSpec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.createSpec'),
    name: 'Create spec',
    icon: 'ph--blueprint--regular',
    description: trim`
      Creates a spec: .mdl text describing what a product area should reach. Pass a feature to make the spec that
      breaks that feature down (a feature has at most one; its existing one is returned). Or pass a project to add the
      spec to that project's specs, its work tracked in the project's tasks; a project for a breakdown is refused.
      Pass the dialects whose blocks the text uses; none means the core and changelog blocks only.
    `,
  },
  services: [Database.Service],
  types: [Spec.Spec, Feature.Feature, Project.Project],
  input: Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    dialects: Schema.optional(
      Schema.Array(Schema.String).annotate({ description: 'Ids of the dialect specs whose blocks the text uses.' }),
    ),
    project: Schema.optional(Ref.Ref(Project.Project)),
    feature: Schema.optional(Ref.Ref(Feature.Feature).annotate({ description: 'The feature the spec breaks down.' })),
  }),
  output: Schema.Struct({ spec: Type.getSchema(Spec.Spec) }),
}).pipe(Operation.mutation('write'));

export const UpdateSpec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.updateSpec'),
    name: 'Update spec',
    icon: 'ph--pencil-simple--regular',
    description:
      "Changes a spec's name, description or the project that owns it; fields left out are kept, and a null project releases it. A breakdown spec is refused, since it belongs to its feature.",
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

export const AddFeatureDependency = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.addFeatureDependency'),
    name: 'Add feature dependency',
    icon: 'ph--tree-structure--regular',
    description: trim`
      Records that a feature does not work without another one, which may sit on another spec. Features form a DAG, so
      a dependency that would close a cycle is refused and the error names the features on it. Adding one twice is a
      no-op.
    `,
  },
  services: [Database.Service],
  types: [Feature.Feature, Feature.DependsOn],
  input: Schema.Struct({
    feature: Ref.Ref(Feature.Feature).annotate({ description: 'The feature that needs the other.' }),
    dependsOn: Ref.Ref(Feature.Feature).annotate({ description: 'The feature it needs.' }),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

export const RemoveFeatureDependency = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.removeFeatureDependency'),
    name: 'Remove feature dependency',
    icon: 'ph--tree-structure--regular',
    description: 'Removes the record that a feature needs another one. Removing a missing dependency is a no-op.',
  },
  services: [Database.Service],
  types: [Feature.Feature, Feature.DependsOn],
  input: Schema.Struct({
    feature: Ref.Ref(Feature.Feature),
    dependsOn: Ref.Ref(Feature.Feature),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('destructive'));

export const LinkFeatureTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.linkFeatureTask'),
    name: 'Link task to feature',
    icon: 'ph--link--regular',
    description: trim`
      Records that a task is work toward a feature. Do this when you pick up a task that moves a feature,
      so its spec's map shows the work. A task may move several features. Linking twice is a no-op.
    `,
  },
  services: [Database.Service],
  types: [Feature.Feature, Feature.Implements, Task.Task],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
    feature: Ref.Ref(Feature.Feature),
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
      that shows it. Pass every feature and task it demonstrates in targets.
    `,
  },
  services: [Database.Service],
  // The deck's own types are plugin-presenter's, which implements this operation; it depends on this plugin.
  types: [Showcase.Demonstrates, Text.Text],
  input: Schema.Struct({
    name: Schema.String,
    content: Schema.String.annotate({ description: 'Markdown for the first slide.' }),
    targets: Schema.Array(Ref.Ref(Obj.Unknown)).annotate({ description: 'The features and tasks it demonstrates.' }),
    artifacts: Schema.optional(
      Schema.Array(Ref.Ref(Obj.Unknown)).annotate({
        description: 'Files, diagrams, pull requests and other evidence, one slide each, in order.',
      }),
    ),
  }),
  output: Schema.Struct({ showcase: Obj.Unknown }),
}).pipe(Operation.mutation('write'));

/** One feature as an agent reads it: ids to load more, and the joins its card shows. */
export const FeatureSummary = Schema.Struct({
  id: Schema.String,
  link: Schema.optional(Schema.String.annotate({ description: 'The DXN code cites the feature by in @feature tags.' })),
  name: Schema.String,
  description: Schema.optional(Schema.String),
  status: Feature.Status,
  requirements: Schema.Array(Feature.Requirement),
  specs: Schema.Array(Schema.String),
  spec: Schema.String.annotate({ description: 'Id of the spec whose map lists the feature.' }),
  parent: Schema.optional(Schema.String.annotate({ description: 'Id of the feature whose spec lists this one.' })),
  breakdown: Schema.optional(Schema.String.annotate({ description: 'Id of the spec that breaks this feature down.' })),
  dependsOn: Schema.Array(Schema.String),
  tasks: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String, status: Schema.optional(Task.Status) })),
  showcases: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
});
export type FeatureSummary = Schema.Schema.Type<typeof FeatureSummary>;

export const GetFeatures = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.getFeatures'),
    name: "Get a spec's features",
    icon: 'ph--puzzle-piece--regular',
    description: trim`
      Reads the features of a spec's map and of every spec nested beneath them: each one's description, status,
      requirements, spec and parent, the ids of the features it depends on (which may sit on other specs), the tasks
      linked to it and its showcases.
    `,
  },
  services: [Database.Service],
  types: FEATURE_TYPES,
  input: Schema.Struct({ spec: Ref.Ref(Spec.Spec) }),
  output: Schema.Struct({ features: Schema.Array(FeatureSummary) }),
}).pipe(Operation.mutation('none'));

export const ImportSpecFeatures = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.importSpecFeatures'),
    name: 'Import features from a spec',
    icon: 'ph--file-arrow-down--regular',
    description: trim`
      Imports the text of an .mdl spec into a spec: the text becomes the spec's content, and each feat block becomes a
      feature named by its title, with the block's prose as its description, its status line as its status and its req
      lines as its requirements. In the content each block is replaced by an embed of its feature, which holds the
      content from then on; export-spec-features writes the blocks back out.
      Pass the repo path of the spec, which is recorded on each feature so importing again updates them rather than
      adding more. Pass a spec to import into it, a feature to import into the spec that breaks it down, or neither to
      make a new spec (named by name, else the path), owned by the project when one is given.
      Review each description afterwards: it should state the ideal, not the current state.
    `,
  },
  services: [Database.Service],
  types: [Spec.Spec, Feature.Feature, Project.Project, Text.Text],
  input: Schema.Struct({
    path: Schema.String.annotate({
      description: 'Repo path of the spec, e.g. packages/plugins/plugin-inbox/PLUGIN.mdl.',
    }),
    text: Schema.String.annotate({ description: 'The spec text.' }),
    spec: Schema.optional(Ref.Ref(Spec.Spec)),
    feature: Schema.optional(Ref.Ref(Feature.Feature)),
    name: Schema.optional(Schema.String.annotate({ description: 'Name of a new spec; defaults to the path.' })),
    project: Schema.optional(Ref.Ref(Project.Project)),
  }),
  output: Schema.Struct({
    spec: Schema.String.annotate({ description: 'Id of the spec imported into.' }),
    created: Schema.Array(Schema.String).annotate({ description: 'Ids of the features added.' }),
    updated: Schema.Array(Schema.String).annotate({ description: 'Ids of the features whose requirements changed.' }),
  }),
}).pipe(Operation.mutation('write'));

export const ExportSpecFeatures = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.exportSpecFeatures'),
    name: 'Export a spec as text',
    icon: 'ph--file-arrow-up--regular',
    description: trim`
      Reads a spec's content as an .mdl file: its prose as written, with each feature it holds written out as a feat
      block (the feature's name, status, description and req lines). Read a spec through this operation rather than its
      raw content, which holds embeds of the features rather than their text. A feature read in from a file keeps its
      block id; others are numbered after the highest F-n in the text.
    `,
  },
  services: [Database.Service],
  types: [Spec.Spec, Feature.Feature, Text.Text],
  input: Schema.Struct({ spec: Ref.Ref(Spec.Spec) }),
  output: Schema.Struct({ text: Schema.String }),
}).pipe(Operation.mutation('none'));

export const ImportFeatureLinks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.code.importFeatureLinks'),
    name: 'Import feature links',
    icon: 'ph--code--regular',
    description: trim`
      Records which code cites which feature. Pass the links the scan-feature-links script prints: each one is a
      @feature tag's DXN and the file, line and symbol it documents. Each DXN is resolved against the features of
      this space; every feature that resolves has its code links replaced by the ones given for it. Links that do
      not resolve are returned with their status.
    `,
  },
  services: [Database.Service],
  types: [Feature.Feature],
  input: Schema.Struct({ links: Schema.Array(FeatureLink.Link) }),
  output: Schema.Struct({
    features: Schema.Number.annotate({ description: 'How many features had their code links replaced.' }),
    unresolved: Schema.Array(
      Schema.Struct({ dxn: Schema.String, path: Schema.String, line: Schema.Number, status: FeatureLink.Status }),
    ),
    outdated: Schema.Array(
      Schema.Struct({ dxn: Schema.String, link: Schema.String, status: FeatureLink.Status }).annotate({
        description: 'Links that resolved by key or mnemonic alone, with the DXN the tag should cite instead.',
      }),
    ),
  }),
}).pipe(Operation.mutation('write'));

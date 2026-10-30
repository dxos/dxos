//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { DXN } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import * as Feature from './Feature.ts';
import * as FeatureLink from './FeatureLink.ts';
import * as Showcase from './Showcase.ts';

/**
 * Every type a spec's features touch. Declared on the operations (`types`) as well as in the plugin's schema
 * capability, because a host that imports the handler set without activating the plugin — the EDGE
 * operation-service behind MCP — registers only what the operations declare.
 */
export const TYPES = [
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

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.createFeature'),
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

export const Update = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.updateFeature'),
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

export const Delete = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.deleteFeature'),
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
    key: DXN.make('org.dxos.operation.projects.createSpec'),
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
    key: DXN.make('org.dxos.operation.projects.updateSpec'),
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

export const AddDependency = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.addFeatureDependency'),
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

export const RemoveDependency = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.removeFeatureDependency'),
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

export const LinkTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.linkFeatureTask'),
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
    key: DXN.make('org.dxos.operation.projects.createShowcase'),
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
    key: DXN.make('org.dxos.operation.projects.getFeatures'),
    name: "Get a spec's features",
    icon: 'ph--puzzle-piece--regular',
    description: trim`
      Reads the features of a spec's map and of every spec nested beneath them: each one's description, status,
      requirements, spec and parent, the ids of the features it depends on (which may sit on other specs), the tasks
      linked to it and its showcases.
    `,
  },
  services: [Database.Service],
  types: TYPES,
  input: Schema.Struct({ spec: Ref.Ref(Spec.Spec) }),
  output: Schema.Struct({ features: Schema.Array(FeatureSummary) }),
}).pipe(Operation.mutation('none'));

export const ImportSpec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.importSpecFeatures'),
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

export const ExportSpec = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.exportSpecFeatures'),
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

export const ImportLinks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.importFeatureLinks'),
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

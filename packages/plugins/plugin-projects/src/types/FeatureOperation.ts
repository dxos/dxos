//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
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
 * Every type a project's features touch. Declared on the operations (`types`) as well as in the plugin's schema
 * capability, because a host that imports the handler set without activating the plugin — the EDGE
 * operation-service behind MCP — registers only what the operations declare.
 */
export const TYPES = [
  Feature.Feature,
  Feature.DependsOn,
  Feature.Implements,
  Project.Project,
  Showcase.Showcase,
  Showcase.Demonstrates,
  Task.Task,
  Text.Text,
];

/** Adding the dependency would close a cycle; the message names the features on it. */
export class DependencyCycleError extends BaseError.extend(
  'DependencyCycleError',
  'The dependency would make the features depend on themselves.',
) {}

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.createFeature'),
    name: 'Create feature',
    icon: 'ph--puzzle-piece--regular',
    description: trim`
      Creates a feature: a goal state the product should reach, such as "Compose & send works against Gmail".
      Pass a project to list it on that project's features. Parts of a feature are subfeatures, set with the update
      operation.
      Specs stay in the repo; list their paths (e.g. packages/plugins/plugin-inbox/PLUGIN.mdl#F-3) in specs.
    `,
  },
  services: [Database.Service],
  types: [Feature.Feature, Project.Project],
  input: Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    status: Schema.optional(Feature.Status.annotate({ description: 'Defaults to planned.' })),
    key: Schema.optional(
      DXN.NameSchema.annotate({
        description:
          "The feature's meta.key, a dotted name such as network.dxos.team.features.mcp.codeMode. Code cites the feature as dxn:<key>#<mnemonic>.",
      }),
    ),
    specs: Schema.optional(Schema.Array(Schema.String)),
    project: Schema.optional(
      Ref.Ref(Project.Project).annotate({ description: "Lists the new feature on this project's features." }),
    ),
  }),
  output: Schema.Struct({ feature: Type.getSchema(Feature.Feature) }),
}).pipe(Operation.mutation('write'));

export const Update = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.updateFeature'),
    name: 'Update feature',
    icon: 'ph--pencil-simple--regular',
    description: trim`
      Changes a feature's key, name, description, status, specs, subfeatures or project; fields left out are kept.
      A project moves the feature onto that project's features; null takes it off any project.
      Subfeatures are the feature's parts, each with its own status, and replace the whole list when given.
      Set status when you observe it: in-progress when work starts, prototype when it works in a demo,
      operational when people can rely on it, failing when it worked before and does not now.
    `,
  },
  services: [Database.Service],
  types: [Feature.Feature, Project.Project],
  input: Schema.Struct({
    feature: Ref.Ref(Feature.Feature),
    key: Schema.optional(
      Schema.NullOr(DXN.NameSchema).annotate({ description: "Sets the feature's meta.key; null removes it." }),
    ),
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    status: Schema.optional(Feature.Status),
    specs: Schema.optional(Schema.Array(Schema.String)),
    subfeatures: Schema.optional(Schema.Array(Feature.Subfeature)),
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
      Records that a feature does not work without another one. Features form a DAG, so a dependency
      that would close a cycle is refused and the error names the features on it. Adding one twice is a no-op.
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
      so the project's Features tab shows the work. A task may move several features. Linking twice is a no-op.
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
    icon: 'ph--presentation-chart--regular',
    description: trim`
      Creates a showcase: the evidence that a feature works or a task is done. Write what you showed and how
      to reproduce it as markdown in content, and put the screenshots and videos you uploaded as files and the
      pull requests the work landed in into artifacts. Pass every feature and task it demonstrates in targets.
    `,
  },
  services: [Database.Service],
  types: [Showcase.Showcase, Showcase.Demonstrates, Text.Text],
  input: Schema.Struct({
    name: Schema.String,
    content: Schema.String.annotate({ description: 'Markdown body.' }),
    targets: Schema.Array(Ref.Ref(Obj.Unknown)).annotate({ description: 'The features and tasks it demonstrates.' }),
    artifacts: Schema.optional(
      Schema.Array(Ref.Ref(Obj.Unknown)).annotate({ description: 'Files, pull requests and other evidence.' }),
    ),
  }),
  output: Schema.Struct({ showcase: Type.getSchema(Showcase.Showcase) }),
}).pipe(Operation.mutation('write'));

/** One feature as an agent reads it: ids to load more, and the joins its card shows. */
export const FeatureSummary = Schema.Struct({
  id: Schema.String,
  link: Schema.optional(Schema.String.annotate({ description: 'The DXN code cites the feature by in @feature tags.' })),
  name: Schema.String,
  status: Feature.Status,
  specs: Schema.Array(Schema.String),
  subfeatures: Schema.Array(Feature.Subfeature),
  dependsOn: Schema.Array(Schema.String),
  tasks: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String, status: Schema.optional(Task.Status) })),
  showcases: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
});
export type FeatureSummary = Schema.Schema.Type<typeof FeatureSummary>;

export const GetFeatures = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.getFeatures'),
    name: "Get a project's features",
    icon: 'ph--puzzle-piece--regular',
    description: trim`
      Reads the features listed on a project: each one's status, specs, subfeatures, the ids of the features it
      depends on, the tasks linked to it and its showcases.
    `,
  },
  services: [Database.Service],
  types: TYPES,
  input: Schema.Struct({ project: Ref.Ref(Project.Project) }),
  output: Schema.Struct({ features: Schema.Array(FeatureSummary) }),
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

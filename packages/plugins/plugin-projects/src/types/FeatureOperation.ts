//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { DXN } from '@dxos/keys';
import { File, PullRequest, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import * as Feature from './Feature.ts';
import * as FeatureMap from './FeatureMap.ts';
import * as Showcase from './Showcase.ts';

/** Adding the dependency would close a cycle; the message names the features on it. */
export class DependencyCycleError extends BaseError.extend(
  'DependencyCycleError',
  'The dependency would make the features depend on themselves.',
) {}

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.feature.create'),
    name: 'Create feature',
    icon: 'ph--puzzle-piece--regular',
    description: trim`
      Creates a feature: a goal state the product should reach, such as "Compose & send works against Gmail".
      Pass a parent to make it a subfeature of an existing feature, and a map to place it on a feature map.
      Specs stay in the repo; list their paths (e.g. packages/plugins/plugin-inbox/PLUGIN.mdl#F-3) in specs.
    `,
  },
  services: [Database.Service],
  input: Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    status: Schema.optional(Feature.Status.annotate({ description: 'Defaults to planned.' })),
    specs: Schema.optional(Schema.Array(Schema.String)),
    parent: Schema.optional(
      Ref.Ref(Feature.Feature).annotate({ description: 'Makes the new feature its subfeature.' }),
    ),
    map: Schema.optional(Ref.Ref(FeatureMap.FeatureMap).annotate({ description: 'Adds the new feature to this map.' })),
  }),
  output: Schema.Struct({ feature: Type.getSchema(Feature.Feature) }),
}).pipe(Operation.mutation('write'));

export const Update = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.feature.update'),
    name: 'Update feature',
    icon: 'ph--pencil-simple--regular',
    description: trim`
      Changes a feature's name, description, status or specs; fields left out are kept.
      Set status when you observe it: in-progress when work starts, prototype when it works in a demo,
      operational when people can rely on it, failing when it worked before and does not now.
    `,
  },
  services: [Database.Service],
  input: Schema.Struct({
    feature: Ref.Ref(Feature.Feature),
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    status: Schema.optional(Feature.Status),
    specs: Schema.optional(Schema.Array(Schema.String)),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

export const AddDependency = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.feature.addDependency'),
    name: 'Add feature dependency',
    icon: 'ph--tree-structure--regular',
    description: trim`
      Records that a feature does not work without another one. Features form a DAG, so a dependency
      that would close a cycle is refused and the error names the features on it. Adding one twice is a no-op.
    `,
  },
  services: [Database.Service],
  input: Schema.Struct({
    feature: Ref.Ref(Feature.Feature).annotate({ description: 'The feature that needs the other.' }),
    dependsOn: Ref.Ref(Feature.Feature).annotate({ description: 'The feature it needs.' }),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

export const RemoveDependency = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.feature.removeDependency'),
    name: 'Remove feature dependency',
    icon: 'ph--tree-structure--regular',
    description: 'Removes the record that a feature needs another one. Removing a missing dependency is a no-op.',
  },
  services: [Database.Service],
  input: Schema.Struct({
    feature: Ref.Ref(Feature.Feature),
    dependsOn: Ref.Ref(Feature.Feature),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('destructive'));

export const LinkTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.feature.linkTask'),
    name: 'Link task to feature',
    icon: 'ph--link--regular',
    description: trim`
      Records that a task is work toward a feature. Do this when you pick up a task that moves a feature,
      so the feature map shows the work. A task may move several features. Linking twice is a no-op.
    `,
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
    feature: Ref.Ref(Feature.Feature),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

export const CreateShowcase = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.showcase.create'),
    name: 'Create showcase',
    icon: 'ph--presentation-chart--regular',
    description: trim`
      Creates a showcase: the evidence that a feature works or a task is done. Write what you showed and how
      to reproduce it as markdown in content, attach screenshots and videos you uploaded as files in media,
      and the pull requests the work landed in. Pass every feature and task it demonstrates in targets.
    `,
  },
  services: [Database.Service],
  input: Schema.Struct({
    name: Schema.String,
    content: Schema.String.annotate({ description: 'Markdown body.' }),
    targets: Schema.Array(Ref.Ref(Obj.Unknown)).annotate({ description: 'The features and tasks it demonstrates.' }),
    media: Schema.optional(Schema.Array(Ref.Ref(File.File))),
    pullRequests: Schema.optional(Schema.Array(Ref.Ref(PullRequest.PullRequest))),
  }),
  output: Schema.Struct({ showcase: Type.getSchema(Showcase.Showcase) }),
}).pipe(Operation.mutation('write'));

export const AddToMap = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.featureMap.add'),
    name: 'Add feature to map',
    icon: 'ph--graph--regular',
    description: 'Adds an existing feature to a feature map. Adding one twice is a no-op.',
  },
  services: [Database.Service],
  input: Schema.Struct({
    map: Ref.Ref(FeatureMap.FeatureMap),
    feature: Ref.Ref(Feature.Feature),
  }),
  output: Schema.Void,
}).pipe(Operation.mutation('write'));

/** One feature as an agent reads it: ids to load more, and the joins a map shows. */
export const FeatureSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Feature.Status,
  specs: Schema.Array(Schema.String),
  subfeatures: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, status: Feature.Status })),
  dependsOn: Schema.Array(Schema.String),
  tasks: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String, status: Schema.optional(Task.Status) })),
  showcases: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
});
export type FeatureSummary = Schema.Schema.Type<typeof FeatureSummary>;

export const GetMap = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.featureMap.get'),
    name: 'Get feature map',
    icon: 'ph--graph--regular',
    description: trim`
      Reads a feature map: each feature's status, specs, subfeatures, the ids of the features it depends on,
      the tasks linked to it and its showcases.
    `,
  },
  services: [Database.Service],
  input: Schema.Struct({ map: Ref.Ref(FeatureMap.FeatureMap) }),
  output: Schema.Struct({ name: Schema.optional(Schema.String), features: Schema.Array(FeatureSummary) }),
}).pipe(Operation.mutation('none'));

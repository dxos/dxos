//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import { Project } from '../../../types';

export const ProjectRules = Operation.make({
  meta: {
    key: 'org.dxos.function.project-wizard.project-rules',
    name: 'Project rules',
    description: 'Gets the rules for creating a project.',
  },
  input: Schema.Struct({}),
  output: Schema.String,
});

export const CreateProject = Operation.make({
  meta: {
    key: 'org.dxos.function.project-wizard.create-project',
    name: 'Create project',
    description: 'Creates a new project.',
  },
  input: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the project to create.',
    }),
    spec: Schema.String.annotations({
      description:
        'The goal of the project. Be specic but not to verbose. The agent will use this as a core objective and set of rules to follow.',
    }),
    blueprints: Schema.Array(Schema.String).annotations({
      description: 'The keys blueprints to use for the project.',
      examples: [['org.dxos.blueprint.markdown', 'org.dxos.blueprint.database']],
    }),
    subscriptions: Schema.Array(Ref.Ref(Obj.Unknown)).annotations({
      description: 'The objects to subscribe to for the project. Can be references to mailboxes.',
    }),
  }),
  output: Project.Project,
  services: [Blueprint.RegistryService, Database.Service, QueueService, Feed.FeedService],
});

export const SyncTriggers = Operation.make({
  meta: {
    key: 'org.dxos.function.project.sync-triggers',
    name: 'Sync triggers',
    description:
      'Synchronizes triggers in the database with the project subscriptions. Call this after editing the subscriptions array.',
  },
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotations({
      description: 'The project whose triggers should be synced.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

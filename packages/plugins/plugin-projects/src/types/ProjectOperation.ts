//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Chat } from '@dxos/assistant-toolkit';
import { AgentService } from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

/**
 * Every project verb the project skill drives, and the only module it needs for them.
 *
 * `Create` is the one that reaches beyond compute/echo: templates are a capability, so it declares
 * `Capability.Service`. That costs a remote host (edge operation-service, workerd) nothing it does
 * not already load — the workerd capability barrel imports `@dxos/app-framework/Capability`
 * itself — and a host contributing no templates still creates a blank project, because the handler
 * appends the built-in blank as a fallback. The mailbox pipelines, which do pull an app-only graph
 * (`@dxos/plugin-inbox`, `@dxos/ai`), live in `ProjectMailboxOperation` for that reason.
 */

/**
 * Programmatic project creation — the entry point other plugins use to create (and pre-wire)
 * projects without reaching into plugin internals. Resolves the template (the default one when unspecified),
 * scaffolds the owned instructions/artifacts graph, and files the project in the Projects section.
 *
 * A generic object create makes one empty object; this one returns a whole wired graph, and the
 * navigation path to the result.
 */
/**
 * Opens a conversation about one task: a new chat, filed in the space, carrying the task in its
 * `tasks` checklist so the agent starts with the work already in front of it.
 *
 * NOTE: `Chat.tasks` is a `SetParent` field, so the task's ECHO parent moves from its task set to the
 * chat — the task follows the chat's lifecycle from here on.
 */
export const DelegateTaskToChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.delegateTaskToChat'),
    name: 'Delegate Task To Chat',
    description: 'Creates a chat for a task and places the task in its checklist.',
    icon: 'ph--chat-text--regular',
  },
  // `AgentService` because the operation runs the chat's first turn: a message written to the feed
  // is a message nobody read.
  // `AgentService` because the operation runs the chat's first turn: a message written to the
  // feed is a message nobody read.
  services: [Capability.Service, Database.Service, AgentService],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task),
  }),
  output: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
  }),
}).pipe(Operation.mutation('write'));

export const Create = Operation.make({
  meta: {
    // `projectCreate`, not `create`: the whole key derives the tool name, so a bare `create` would
    // read as `projects-create` — accurate, but the verb alone is too generic to stand on its own.
    key: DXN.make('org.dxos.operation.projects.create'),
    name: 'Create Project',
    description:
      'Creates a project and its owned graph: agent instructions, an artifacts collection, and a ' +
      'task set for its tasks. Returns the project with a `taskSet` reference — pass that reference ' +
      'to taskCreate to record work against it.',
    icon: 'ph--stack--regular',
  },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Template id (`ProjectCapabilities.Template`); defaults to the default template. */
    templateId: Schema.optional(Schema.String),
    /** The object the project is created for (passed to the template's `appliesTo`/`scaffold`). */
    subject: Schema.optional(Obj.Unknown),
  }),
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    project: Type.getSchema(Project.Project),
  }),
}).pipe(Operation.mutation('write'));

/**
 * The detail read behind a project reference: per-task-set open/total counts, the outline's text,
 * and the artifact inventory with typenames — derived figures and a ref walk that a generic read
 * would leave the caller to do one object at a time.
 */
export const GetProject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.get'),
    name: 'Get Project',
    description: 'Read a project in full: status, task-set summary (open/total per set), outline, and artifacts.',
    icon: 'ph--info--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project),
  }),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    status: Schema.optional(Project.ProjectStatus),
    description: Schema.optional(Schema.String),
    taskSet: Schema.optional(
      Schema.Struct({
        id: Schema.String,
        name: Schema.optional(Schema.String),
        openCount: Schema.Number,
        totalCount: Schema.Number,
      }),
    ),
    /** The project's checklist markdown, when it has an outline. */
    outline: Schema.optional(Schema.Struct({ id: Schema.String, content: Schema.String })),
    artifacts: Schema.Array(Schema.Struct({ id: Schema.String, typename: Schema.String })),
  }),
}).pipe(Operation.mutation('none'));

//
// Artifacts — the project's work products. The skill's own verbs: `Project.artifacts` is a plain
// ref array, but adding is idempotent by entity id, which a generic object patch cannot be.
//

/**
 * Files an object into `Project.artifacts`, idempotently. The array is plain refs, but membership is
 * compared by entity id — the same object can be addressed local or space-qualified — so a generic
 * patch would need a read-modify-write and would still double-file a differently-spelled URI.
 */
export const ArtifactAdd = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.addArtifact'),
    name: 'Add project artifact',
    icon: 'ph--stack-plus--regular',
    description: trim`
      Files an object into a project's artifacts collection.
      Use this after creating an object (document, outline, sheet, contact, …) while working in a
      project's context, so the project owns it and it appears in the project's artifacts list.
      When the object was produced for a task on your checklist, pass that task too, so the finished
      task shows what it made. Adding the same object twice is a no-op.
    `,
  },
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({
      description: 'The project to file into (its reference is in the chat context).',
    }),
    object: Ref.Ref(Obj.Unknown).annotate({
      description: 'The object to file as an artifact.',
    }),
    task: Schema.optional(
      Ref.Ref(Task.Task).annotate({
        description:
          'The task this object was produced for, when working one — records it on the task as well, ' +
          'so a finished task shows what it made.',
      }),
    ),
  }),
  output: Schema.Void,
  services: [Database.Service],
}).pipe(Operation.mutation('write'));

/** One artifact row: enough to identify and load the object, without inlining its content. */
export const ArtifactInfo = Schema.Struct({
  dxn: Schema.String,
  typename: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
});

/**
 * Lists the project's artifacts as identity-only rows (DXN, typename, label) rather than inlining
 * their content, and degrades a broken ref to a placeholder row instead of failing the listing.
 */
export const ArtifactList = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.listArtifact'),
    name: 'List project artifacts',
    icon: 'ph--stack--regular',
    description: trim`
      Lists the objects in a project's artifacts collection (DXN, type, and label per artifact).
      Use this to find what the project already holds before searching the whole space; load an
      artifact's content with the database-load tool when needed.
    `,
  },
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({
      description: 'The project whose artifacts to list (its reference is in the chat context).',
    }),
  }),
  output: Schema.Struct({
    artifacts: Schema.Array(ArtifactInfo),
  }),
  services: [Database.Service],
}).pipe(Operation.mutation('none'));

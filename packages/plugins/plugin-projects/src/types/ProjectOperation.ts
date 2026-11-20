//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Repo, Task, Thread } from '@dxos/types';
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
 * Opens one conversation about a list of tasks: a new chat, filed in the space, carrying them in its
 * `tasks` checklist in the order given, so the agent starts with the work already in front of it.
 *
 * One chat for the whole list rather than one per task: a reader delegating three tasks is handing
 * over a body of work, and three parallel sessions could not see each other's results.
 *
 * The checklist is a plain ref array, so a delegated task keeps the task set it came from — the chat
 * works on it, it does not take it.
 */
export const DelegateTaskToChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.delegateTaskToChat'),
    name: 'Delegate Tasks To Chat',
    description: 'Creates a chat for one or more tasks and places them in its checklist.',
    icon: 'ph--chat-text--regular',
  },
  // `AgentService` because the operation runs the chat's first turn: a message written to the
  // feed is a message nobody read.
  services: [Capability.Service, Database.Service, AgentService.AgentService],
  input: Schema.Struct({
    // A plain array rather than `Schema.NonEmptyArray`, which serializes to `prefixItems` — a
    // keyword the persisted-operation JSON schema does not carry. The handler rejects an empty list.
    tasks: Schema.Array(Ref.Ref(Task.Task)),
    harness: Schema.optional(
      Schema.String.annotate({
        description:
          "Id of the agent that works the tasks, e.g. composer or claude-code. Defaults to the reader's default agent.",
      }),
    ),
    openCompanion: Schema.optional(
      Schema.Boolean.annotate({
        description: "Opens the Assistant companion beside the reader's current plank, showing the new chat.",
      }),
    ),
  }),
  output: Schema.Struct({
    chat: Type.getSchema(Chat.Chat),
  }),
}).pipe(Operation.mutation('write'));

/**
 * Renders one task as a self-contained prompt for an external coding agent — the task's content, its
 * addresses (task, task set, project, space), and what the project is about, so a session started
 * from it can reach the live objects rather than work from a transcription.
 *
 * The prompt tells the agent to take the task on first, which is what makes the handoff visible in
 * the app: the row shows `started` and the agent as its delegate the moment the agent picks
 * it up, exactly as an in-app delegation does.
 */
export const CopyTaskPrompt = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.copyTaskPrompt'),
    name: 'Copy Task Prompt',
    description: 'Builds an agent prompt for a task (content, addresses, project context) and returns it.',
    icon: 'ph--clipboard-text--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    task: Ref.Ref(Task.Task).annotate({ description: 'The task to write a prompt for.' }),
  }),
  // Returned rather than copied: the clipboard write needs the user's click, which only the UI host
  // holds (see the `copy-prompt` task action), and a headless caller wants the text itself.
  output: Schema.Struct({
    prompt: Schema.String,
  }),
}).pipe(Operation.mutation('none'));

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
      A pull request is recorded on the task given — a sub-task fixed on its own carries its own PR;
      it is refused only when that task already has a different open PR.
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

/**
 * Edits the project's `Repo.RepositoriesAnnotation` and its setup script, which no generic object write reaches.
 * The script is kept with the repositories since it prepares exactly those checkouts.
 */
export const UpdateRepositories = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.updateRepositories'),
    name: 'Update Project Repositories',
    icon: 'ph--git-branch--regular',
    description: trim`
      Add repositories to a project's repositories or remove them, and return the list. A cloud coding agent
      checks the list out and works in the first. With neither \`add\` nor \`remove\` nor \`setupScript\`, returns
      the list unchanged. A repository must already be an org.dxos.type.repo object in the space.
      \`setupScript\` is a bash script a cloud coding agent's sandbox runs once, as root, after the repositories are
      checked out and before the agent starts, from the first repository's directory (for example to install the
      toolchain the repositories pin); a blank string clears it, and it replaces the previous script whole.
    `,
  },
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({ description: 'The project (its reference is in the chat context).' }),
    add: Schema.optional(
      Schema.Array(Ref.Ref(Repo.Repo)).annotate({
        description: 'Repositories to append, in order; one already listed keeps its place.',
      }),
    ),
    remove: Schema.optional(Schema.Array(Ref.Ref(Repo.Repo)).annotate({ description: 'Repositories to remove.' })),
    setupScript: Schema.optional(
      Schema.String.annotate({
        description: 'The sandbox setup script (bash) to set, replacing the current one; blank clears it.',
      }),
    ),
  }),
  output: Schema.Struct({
    repositories: Schema.Array(Ref.Ref(Repo.Repo)).annotate({ description: "The project's repositories, in order." }),
    setupScript: Schema.optional(Schema.String).annotate({
      description: "The project's setup script, when it has one.",
    }),
  }),
  services: [Database.Service],
}).pipe(Operation.mutation('write'));

/**
 * Reveals a comment thread's span, or else an anchor's text, in whichever open editor shows it, such as a feature's
 * field or a spec's text; the comments companion, a peer's Go to and a follow invoke it.
 */
export const ScrollToAnchor = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.scrollToAnchor'),
    name: 'Scroll to anchor',
    icon: 'ph--anchor-simple--regular',
  },
  input: Schema.Struct({
    subject: Schema.String.annotate({ description: 'Attendable id of the commented object.' }),
    anchor: Schema.String.annotate({ description: 'The anchor to reveal.' }),
    focus: Schema.optional(
      Schema.Boolean.annotate({
        description: 'Select the anchor and take focus (default); false scrolls it to the top instead.',
      }),
    ),
    thread: Schema.optional(Ref.Ref(Thread.Thread).annotate({ description: 'The comment thread to mark current.' })),
  }),
  output: Schema.Boolean.annotate({
    description: 'Whether the anchor was revealed; false while its view is not ready.',
  }),
}).pipe(Operation.mutation('none'));

//
// Spec blocks
//

/**
 * A block's field values as its kind's schema reads them: a string, a list of strings, a list of `{ name, optional,
 * value, note }` rows (a map field such as `input`), or a list of `{ key, label, text }` entries (a keyed field such as
 * `req`).
 */
const BlockFields = Schema.Record(Schema.String, Schema.Unknown);

/** One block of a spec as its kind's schema reads it. */
export const SpecBlock = Schema.Struct({
  kind: Schema.String,
  /** The block's id: a stable key for a numbered kind (`feat k7q2x`), empty for a block with none. */
  key: Schema.String,
  /** The positional label a numbered kind is drawn with (`F-3`); entries carry theirs (`F-3.2`). */
  label: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  prose: Schema.optional(Schema.String),
  fields: BlockFields,
});
export type SpecBlock = Schema.Schema.Type<typeof SpecBlock>;

export const GetSpecBlocks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.getSpecBlocks'),
    name: 'Get Spec Blocks',
    description: trim`
      Read a spec's blocks (features, operations, types, scenarios and any kind its dialects or its own ext blocks
      define), each with its key, positional label, title, prose and field values. Filter by kind.
    `,
    icon: 'ph--list-bullets--regular',
  },
  services: [Database.Service],
  types: [Spec.Spec, Text.Text],
  input: Schema.Struct({
    spec: Ref.Ref(Spec.Spec),
    kind: Schema.optional(Schema.String.annotate({ description: 'Only blocks of this kind, such as `feat`.' })),
  }),
  output: Schema.Struct({ blocks: Schema.Array(SpecBlock) }),
}).pipe(Operation.mutation('none'));

export const SetSpecBlock = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.setSpecBlock'),
    name: 'Set Spec Block',
    description: trim`
      Write one block of a spec, named by key or label. With a kind and no block, or a block no existing one has, adds
      one: a numbered kind gets a fresh key, any other takes the name given. Only what is given changes: a field set to
      null is removed, and a keyed entry without a key gets one. \`after\` moves the block after another; an empty
      string moves it before the first of its kind.
    `,
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  types: [Spec.Spec, Text.Text],
  input: Schema.Struct({
    spec: Ref.Ref(Spec.Spec),
    block: Schema.optional(Schema.String.annotate({ description: 'The key or label of the block.' })),
    kind: Schema.optional(Schema.String.annotate({ description: 'The kind of a new block, such as `feat`.' })),
    title: Schema.optional(Schema.String),
    prose: Schema.optional(Schema.String),
    fields: Schema.optional(BlockFields),
    after: Schema.optional(Schema.String.annotate({ description: 'The key or label to place the block after.' })),
  }),
  output: Schema.Struct({ key: Schema.String, label: Schema.optional(Schema.String) }),
}).pipe(Operation.mutation('write'));

export const DeleteSpecBlock = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.deleteSpecBlock'),
    name: 'Delete Spec Block',
    description: 'Remove one block, named by key or label, from a spec.',
    icon: 'ph--trash--regular',
  },
  services: [Database.Service],
  types: [Spec.Spec, Text.Text],
  input: Schema.Struct({ spec: Ref.Ref(Spec.Spec), block: Schema.String }),
  output: Schema.Void,
}).pipe(Operation.mutation('destructive'));

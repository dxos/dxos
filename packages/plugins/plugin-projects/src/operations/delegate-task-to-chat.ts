//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Capability from '@dxos/app-framework/Capability';
import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Task } from '@dxos/types';
import { concat } from '@dxos/util';

import { ProjectOperation } from '#types';

import { findProject } from './find-project.ts';

/**
 * Skills the delegated session needs beyond a chat's defaults: the checklist it works from, the
 * ability to write a document, the project verbs that file what it wrote, and a shell for a task
 * that builds or runs something. The project's own skill arrives with the subject binding — a
 * `Project` carries it as an annotation. A key with no plugin behind it binds nothing: the binder
 * drops a ref it cannot resolve.
 */
const DELEGATION_SKILL_KEYS = [
  'org.dxos.skill.planning',
  'org.dxos.skill.markdown',
  'org.dxos.skill.project',
  'org.dxos.skill.sandbox',
];

const handler: Operation.WithHandler<typeof ProjectOperation.DelegateTaskToChat> =
  ProjectOperation.DelegateTaskToChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ tasks: taskRefs }) {
        // A chat delegating nothing has no subject; the schema cannot say so (see the operation's
        // input), so the invariant is where an empty list stops.
        invariant(taskRefs.length > 0, 'Expected at least one task to delegate.');
        const requested = yield* Effect.forEach(taskRefs, (taskRef) => Database.load(taskRef));
        const { db } = yield* Database.Service;

        // Idempotent over re-invocation: a task the agent already holds is skipped rather than
        // handed to a second session, and a list of nothing else stops here the way an empty one does.
        const tasks = requested.filter((task) => !Task.isAgentWorking(task));
        invariant(tasks.length > 0, 'Expected at least one task not already delegated.');

        // The chat is filed under the tasks' project, so it lands in that project's navtree rather
        // than loose in the space. Walked from the tasks rather than taken as input: the list the
        // action runs from knows the tasks and nothing else.
        //
        // One chat can only be filed under one project, and its opening prompt tells the agent to
        // file what it makes into THAT project — so a list spanning two is rejected rather than
        // silently filed under whichever came first. The UI cannot produce one (a checked set comes
        // from a single list), but the operation is a skill verb an agent calls with any refs.
        // A task with no project rides along: nothing about it contradicts the chosen one.
        const projects = new Map(
          tasks.flatMap((task) => {
            const project = findProject(task);
            return project ? [[project.id, project] as const] : [];
          }),
        );
        invariant(projects.size <= 1, 'Expected every delegated task to belong to the same project.');
        const [project] = projects.values();

        const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
          // Named after the task only when it is about exactly one: a chat holding three would be
          // claiming to be about whichever happened to be first.
          ...(tasks.length === 1 && { name: tasks[0].title }),
        });

        // The tasks join the chat's checklist in the order they were given, which is the order the
        // list showed them — the reader's reading order is the agent's working order.
        Obj.update(chat, (chat) => {
          chat.tasks.push(...tasks.map((task) => Ref.make(task)));
        });

        // Parent edge before the add, as the project's own create-chat action does: it files the
        // chat under the project rather than the space root.
        if (project) {
          Chat.linkCompanion({ chat, subject: project });
        }

        // Added here rather than through `SpaceOperation.AddObject`: this is a database write, and
        // routing it through plugin-space would make the operation unavailable to any host that does
        // not run that plugin.
        db.add(chat);

        // Whoever delegated the work reviews it, so a finished task comes back to them rather than
        // closing itself. `reviewers` being non-empty is what sends the task to `review`.
        const reviewer = yield* currentActor;

        // `started` on delegation, not on completion: the row shows work is underway from the moment
        // the session has it.
        for (const task of tasks) {
          Task.setStatus(task, 'started', { actor: reviewer });
          Obj.update(task, (task) => {
            // The chat's agent holds the work now, so the row says so rather than keeping whoever
            // had it before. Named by the chat, as the planning tool's self-assignment is: a bare
            // role is the supervisor's request to spawn a sub-agent, and its orphan sweep fails a
            // started one no sub-agent is running.
            task.assignee = { role: 'assistant', subject: Ref.make(chat) };
            if (reviewer) {
              task.reviewers = [reviewer];
            }
          });
        }

        yield* bindDelegationContext(chat, project);
        yield* Database.flush();

        // The reader stays where they delegated from — the project's ledger, whose pipeline chart
        // shows the session as it starts — so the operation does not navigate; the chart's session
        // lane is the way into the chat.
        //
        // Best-effort and deliberately not fatal: the delegation itself is already durable — the
        // chat exists, carries the task, and is filed under the project — so a host with no agent
        // runtime (a test harness, a headless client) still delegates, and the reader can send the
        // first turn themselves.
        //
        // `Effect.exit`, not `Effect.catch`: a missing service arrives as a DEFECT (the process
        // layers are `orDie`), which a failure channel handler never sees.
        const started = yield* Operation.invoke(AssistantOperation.RunPromptInChat, {
          chat,
          prompt: OPENING_PROMPT,
        }).pipe(Effect.exit);
        if (Exit.isFailure(started)) {
          log.warn('delegated chat did not start its turn', { cause: Cause.pretty(started.cause) });
        }

        return { chat };
      }),
    ),
  );

/**
 * References the tasklist rather than restating the tasks: they are already bound to the chat, and
 * a copy in the prompt is one the reader can edit into disagreeing with the original.
 */
const OPENING_PROMPT = concat`
  You have been assigned tasks to work on in this session.
  Read all tasks, then work on them sequentially.
  This may require you to read, update, or create artifacts associated with the project.
  Update the tasklist as you work on each task, and mark tasks ready for review as you complete them.
`;

/** The delegating identity as an actor, for the reviewer field. */
const currentActor = Effect.gen(function* () {
  const client = yield* Capability.get(ClientCapabilities.Client);
  const identity = client.halo.identity.get();
  if (!identity) {
    return undefined;
  }
  return {
    identityDid: identity.did,
    name: identity.profile?.displayName,
    role: 'user' as const,
  };
}).pipe(Effect.catch(() => Effect.succeed(undefined)));

/**
 * Binds what the session needs onto the chat's feed: the skills, and the project as a context
 * object so the artifact verbs have something to file into.
 *
 * Bound here rather than through `AssistantOperation.BindChatContext`, which would also run every
 * contributed subject-context provider: that operation requires `Registry.Service`, and declaring it
 * makes this one unresolvable on a host that does not provide it.
 */
const bindDelegationContext = Effect.fnUntraced(function* (chat: Chat.Chat, project: Project.Project | undefined) {
  const feed = yield* Database.load(chat.feed);
  const runtime = yield* Effect.context<Database.Service>();
  const binder = new AiContext.Binder({ feed, runtime });
  // Registry refs rather than database clones: the ECHO resolver spans the registry, as
  // `CreateChat` does for the default set. The project's instructions name the skills and context
  // its work needs (a studio project's storyboard verbs, say); the subject binding only renders
  // their text, so those refs are bound too.
  const bindings = project ? yield* projectBindings(project) : { skills: [], objects: [] };
  const skills = [...DELEGATION_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))), ...bindings.skills];
  const objects = project ? [Ref.make(project), ...bindings.objects] : [];
  yield* Effect.promise(() => binder.use((binder: AiContext.Binder) => binder.bind({ skills, objects })));
});

/** `Project.contextBindings` needs the instructions ref resolved, which a fresh load guarantees. */
const projectBindings = Effect.fnUntraced(function* (project: Project.Project) {
  if (project.instructions) {
    yield* Database.load(project.instructions);
  }
  return Project.contextBindings(project);
});

export default handler;

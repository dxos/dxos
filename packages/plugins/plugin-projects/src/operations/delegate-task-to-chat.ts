//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import { AiContext } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { ProjectOperation } from '#types';

import { getProjectChatPath } from '../paths';

/**
 * Skills the delegated session needs beyond a chat's defaults: the checklist it works from, the
 * ability to write a document, and the project verbs that file what it wrote. The project's own
 * skill arrives with the subject binding — a `Project` carries it as an annotation.
 */
const DELEGATION_SKILL_KEYS = ['org.dxos.skill.planning', 'org.dxos.skill.markdown', 'org.dxos.skill.project'];

const handler: Operation.WithHandler<typeof ProjectOperation.DelegateTaskToChat> =
  ProjectOperation.DelegateTaskToChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ task: taskRef }) {
        const task = yield* Database.load(taskRef);
        const { db } = yield* Database.Service;

        // The chat is filed under the task's project, so it lands in that project's navtree rather
        // than loose in the space. Walked from the task rather than taken as input: the row the
        // action runs from knows the task and nothing else.
        const project = findProject(task);

        const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
          name: task.title,
        });

        // The task moves into the chat's checklist. `Chat.tasks` carries `SetParent`, so this also
        // moves the task's ECHO parent from its task set to the chat.
        Obj.update(chat, (chat) => {
          chat.tasks = [...chat.tasks, Ref.make(task)];
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
        Task.setStatus(task, 'started', { actor: reviewer });
        if (reviewer) {
          Obj.update(task, (task) => {
            task.reviewers = [reviewer];
          });
        }

        yield* bindDelegationContext(chat, project);
        yield* Database.flush();

        // The reader is taken to the work they just delegated. Opened before the turn starts so the
        // first tokens land on screen rather than into a conversation nobody is looking at.
        //
        // Both steps are best-effort and deliberately not fatal: the delegation itself is already
        // durable — the chat exists, carries the task, and is filed under the project — so a host
        // with no layout or no agent runtime (a test harness, a headless client) still delegates,
        // and the reader can send the first turn themselves.
        //
        // `Effect.exit`, not `Effect.catch`: a missing service arrives as a DEFECT (the process
        // layers are `orDie`), which a failure channel handler never sees.
        const opened = yield* openChat(chat, project).pipe(Effect.exit);
        if (Exit.isFailure(opened)) {
          log.warn('delegated chat did not open', { cause: Cause.pretty(opened.cause) });
        }

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
 * Navigates to a chat.
 *
 * A project's chat is composed from this plugin's own path helper rather than asked of
 * `ResolveNavigationTargets`: the Chats branch belongs to this plugin, so it already knows where the
 * chat lives, and the generic resolvers answer with the assistant's Chats section — which lists only
 * UNPARENTED chats, so that path names a node that does not exist and the deck renders nothing.
 * Only a chat outside a project goes to the resolver.
 *
 * `immediate` expands the path instead of validating it. The chat was created moments ago, so its
 * graph node may not exist yet — the branch connector's query has not re-emitted — and validation
 * sends an unmaterialized path to the not-found route, which empties the deck.
 */
const openChat = Effect.fnUntraced(function* (chat: Chat.Chat, project: Project.Project | undefined) {
  const db = Obj.getDatabase(chat);
  const path = project && db ? getProjectChatPath(db.spaceId, project.id, chat.id) : yield* resolvePath(chat);
  if (path) {
    yield* Operation.invoke(LayoutOperation.Open, { subject: [path], navigation: 'immediate' });
  }
});

/** Where a chat outside any project is addressable, per whichever plugin claims it. */
const resolvePath = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const { targets } = yield* Operation.invoke(NavigationOperation.ResolveNavigationTargets, {
    query: { uri: Obj.getURI(chat) },
  });
  return targets[0]?.path;
});

/**
 * References the checklist rather than restating the task: the task is already bound to the chat,
 * and a copy in the prompt is one the reader can edit into disagreeing with the original.
 */
const OPENING_PROMPT = trim`
  Work the task on your checklist. Read it first, then do it.

  File anything you create into this project's artifacts, and mark the task done when it is
  finished — the checklist is what reports your progress.
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
  // `CreateChat` does for the default set.
  const skills = DELEGATION_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key)));
  const objects = project ? [Ref.make(project)] : [];
  yield* Effect.promise(() => binder.use((binder: AiContext.Binder) => binder.bind({ skills, objects })));
});

/** The task's project, walked up the ECHO parents (task → task set → project). */
const findProject = (task: Obj.Any): Project.Project | undefined => {
  let cursor: Obj.Any | undefined = Obj.getParent(task);
  // Bounded: a malformed parent chain must not spin, and nothing legitimate is this deep.
  for (let depth = 0; cursor && depth < 8; depth++) {
    if (Obj.instanceOf(Project.Project, cursor)) {
      return cursor;
    }
    cursor = Obj.getParent(cursor);
  }
  return undefined;
};

export default handler;

//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';

import { SessionConfig } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as Assistant from '@dxos/plugin-assistant/Assistant';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';
import { Task } from '@dxos/types';
import { concat } from '@dxos/util';

import { ProjectOperation } from '#types';

import * as Delegation from './Delegation.ts';

const handler: Operation.WithHandler<typeof ProjectOperation.DelegateTaskToChat> =
  ProjectOperation.DelegateTaskToChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ tasks: taskRefs, harness: requestedHarness, openCompanion = false }) {
        const { requested, tasks } = yield* Delegation.selectTasks(taskRefs);
        const delegator = yield* currentActor;
        const harness = yield* resolveHarness(requestedHarness);
        const { chat, project, sources } = yield* Delegation.fileChat({ requested, tasks, harness, delegator });
        const { db } = yield* Database.Service;

        // Several tasks leave the chat unnamed, and its opening prompt never passes through the chat
        // UI that names a chat after its first message — so it is named from what it was handed.
        if (!chat.name) {
          yield* Operation.schedule(
            AssistantOperation.UpdateChatName,
            { chat, prompt: requested.map((task) => task.title).join('\n') },
            { spaceId: db.spaceId },
          );
        }

        // The project's companion shows the delegated chat, so opening the Assistant beside the ledger
        // lands on the session holding the tasks rather than on a fresh, empty one. Best-effort like the
        // opening turn below: the delegation is durable either way.
        // The same for each source object, so the companion beside the email a task came from shows the
        // session too — and, when opening the companion, for whatever the reader is looking at, since
        // that is the plank it opens beside.
        const attended = openCompanion ? yield* attendedObjects : [];
        for (const companionTo of [...(project ? [project] : []), ...sources, ...attended]) {
          const selected = yield* Operation.invoke(AssistantOperation.SetCurrentChat, {
            companionTo,
            chat,
          }).pipe(Effect.exit);
          if (Exit.isFailure(selected)) {
            log.warn('delegated chat was not made the companion chat', { cause: Cause.pretty(selected.cause) });
          }
        }
        if (openCompanion) {
          const opened = yield* Operation.invoke(LayoutOperation.UpdateCompanion, {
            subject: Attention.linkedSegment(Assistant.COMPANION_VARIANT),
          }).pipe(Effect.exit);
          if (Exit.isFailure(opened)) {
            log.warn('assistant companion did not open', { cause: Cause.pretty(opened.cause) });
          }
        }

        // The reader stays where they delegated from — the project's ledger, whose pipeline chart
        // shows the session as it starts — so the operation does not navigate (it only selects the
        // companion's chat); the chart's session lane is the way into the chat as a plank.
        //
        // Best-effort and deliberately not fatal: the delegation itself is already durable — the
        // chat exists, carries the task, and is filed under the project — so a host with no agent
        // runtime (a test harness, a headless client) still delegates, and the reader can send the
        // first turn themselves.
        //
        // `Effect.exit`, not `Effect.catch`: a missing service arrives as a DEFECT (the process
        // layers are `orDie`), which a failure channel handler never sees.
        const prompt =
          harness === SessionConfig.COMPOSER_HARNESS
            ? yield* renderOpeningPrompt(tasks)
            : yield* Delegation.brief(tasks, project);
        // The brief is the system writing on the reader's behalf, so it shows as context rather than as
        // words the reader typed.
        const started = yield* Operation.invoke(AssistantOperation.RunPromptInChat, {
          chat,
          prompt,
          disposition: 'synthetic',
        }).pipe(Effect.exit);
        if (Exit.isFailure(started)) {
          log.warn('delegated chat did not start its turn', { cause: Cause.pretty(started.cause) });
        }

        return { chat };
      }),
    ),
  );

/**
 * Composer's opening prompt: the tasks by address, so the agent starts from them rather than finding
 * them, and fenced to exactly these — a project's other tasks sit one hop away and are not this
 * session's to work. Its first line is all the collapsed brief shows in the chat.
 */
const OPENING_PROMPT = 'You have been assigned the tasks below.';

const SCOPE_PROMPT = concat`
  Work on these tasks only: the project may hold others, and they are not yours, so do not read,
  change, or act on them. Work on your tasks in order. This may require you to read, update, or
  create artifacts associated with the project. Mark each task ready for review as you complete it.
`;

/** Added when the tasks came from objects (an email), which are bound to the chat beside them. */
const SOURCES_PROMPT = concat`
  Each task names the object it was made from. Those objects are bound to this chat, so their
  content is already in your context; address them, and the tasks, by the URIs given here rather than
  exploring the space or building a URI from an id.
`;

/** One line per task: its title, its URI, and the URIs of the objects it was made from. */
const renderOpeningPrompt = Effect.fnUntraced(function* (tasks: readonly Task.Task[]) {
  const entries = yield* Effect.forEach(tasks, (task) =>
    Effect.gen(function* () {
      const sources = yield* Effect.forEach(task.artifacts ?? [], (ref) => Database.load(ref).pipe(Effect.option));
      const uris = sources.flatMap((source) => (Option.isSome(source) ? [Obj.getURI(source.value)] : []));
      const from = uris.length > 0 ? `; made from ${uris.join(', ')}` : '';
      return { line: `- ${JSON.stringify(task.title)}: ${Obj.getURI(task)}${from}`, hasSources: uris.length > 0 };
    }),
  );
  const hasSources = entries.some((entry) => entry.hasSources);
  return [
    OPENING_PROMPT,
    ...entries.map((entry) => entry.line),
    '',
    SCOPE_PROMPT,
    ...(hasSources ? ['', SOURCES_PROMPT] : []),
  ].join('\n');
});

/**
 * The agent the chat runs on: the one asked for, else the person's default agent while it is
 * available on this device, else Composer's own.
 */
const resolveHarness = Effect.fnUntraced(function* (requested: string | undefined) {
  const agents = yield* Capability.getAll(AssistantCapabilities.Agent);
  if (requested) {
    invariant(
      requested === SessionConfig.COMPOSER_HARNESS || agents.some((agent) => agent.id === requested),
      `Unknown agent: ${requested}`,
    );
    return requested;
  }
  const registry = yield* Capability.getOption(Capabilities.AtomRegistry);
  const settings = yield* Capability.getOption(AssistantCapabilities.Settings);
  if (Option.isNone(registry) || Option.isNone(settings)) {
    return SessionConfig.COMPOSER_HARNESS;
  }
  const preferred = registry.value.get(settings.value).defaultAgent;
  const agent = agents.find((agent) => agent.id === preferred);
  return agent && registry.value.get(agent.availability).available ? agent.id : SessionConfig.COMPOSER_HARNESS;
});

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
 * The objects behind the attended graph nodes and their ancestors (a message open beside its mailbox
 * attends `…/mailbox/message`, and the companion opens on the mailbox plank).
 */
const attendedObjects = Effect.gen(function* () {
  const attention = yield* Capability.getOption(AttentionCapabilities.Attention);
  const appGraph = yield* Capability.getOption(AppCapabilities.AppGraph);
  if (Option.isNone(attention) || Option.isNone(appGraph)) {
    return [];
  }
  const ids = attention.value.getCurrent().flatMap((id) => {
    const segments = id.split('/');
    return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
  });
  const objects = new Map<string, Obj.Unknown>();
  for (const id of ids) {
    const node = AppGraph.getNode(appGraph.value.graph, id);
    if (Option.isSome(node) && Obj.isObject(node.value.data)) {
      objects.set(node.value.data.id, node.value.data);
    }
  }
  return [...objects.values()];
});

export default handler;

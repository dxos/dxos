//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN, EID, URI } from '@dxos/keys';

import { AgentChannels, AgentOperation, AgentSession } from '#types';

import { loadAgentObjects } from './ensure-channel-chat.ts';
import { AgentSessionError } from './errors.ts';
import { sessionSkills } from './modes.ts';

/** Loaded on demand: the context runtime is heavy and only needed when a session's chat is first created. */
const aiContextRuntime = () => import('@dxos/assistant/AiContext');

/** A model NSID (`com.anthropic.model.claude-haiku-4-5.default`) as the chat's session config stores it. */
const parseModel = (model: string) =>
  Effect.try({
    try: () => DXN.make(model.trim()),
    catch: () => new AgentSessionError({ message: `Not a model id: ${model}` }),
  });

/** The agent a caller names: by URI, by name, or the space's only agent. */
const resolveAgent = Effect.fnUntraced(function* (name: string | undefined) {
  const wanted = name?.trim();
  if (wanted && EID.tryParse(wanted)) {
    return yield* Database.resolve(URI.make(wanted), Agent.Agent).pipe(
      Effect.mapError(() => new AgentSessionError({ message: `No agent ${wanted} in this space.` })),
    );
  }
  const agents = yield* Database.query(Query.select(Filter.type(Agent.Agent))).run.pipe(Effect.orDie);
  const matches = wanted ? agents.filter((agent) => agent.name?.toLowerCase() === wanted.toLowerCase()) : agents;
  if (matches.length === 1) {
    return matches[0];
  }
  const names = agents.map((agent) => `${agent.name ?? 'Unnamed'} (${Obj.getURI(agent)})`).join(', ');
  return yield* Effect.fail(
    new AgentSessionError({
      message:
        agents.length === 0
          ? 'The space has no agents.'
          : wanted
            ? `No single agent is called ${wanted}; the space has: ${names}.`
            : `The space has several agents; name one of: ${names}.`,
    }),
  );
});

/** What a new session chat binds: the agent's context and session skills, and every channel's skills. */
const sessionBindings = Effect.fnUntraced(function* (agent: Agent.Agent) {
  const skills: Ref.Ref<Skill.Skill>[] = [...(yield* sessionSkills(agent))];
  const objects = yield* loadAgentObjects(agent);
  for (const channel of yield* AgentChannels.loadChannels(agent)) {
    const config = yield* Database.load(channel.backend.config).pipe(Effect.orElseSucceed(() => undefined));
    if (config) {
      skills.push(...Skill.annotatedSkillRefs(config));
    }
  }
  return { skills, objects };
}, Effect.scoped);

const handler: Operation.WithHandler<typeof AgentOperation.EnsureSessionChat> = AgentOperation.EnsureSessionChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ agent: agentName, kind, key, title, model }) {
        const agent = yield* resolveAgent(agentName);
        const modelId = model === undefined ? undefined : yield* parseModel(model);
        const foreignKey = AgentSession.chatKey(kind, key);
        // The same session may have been opened with more than one agent.
        const existing = yield* Database.query(Query.select(Filter.foreignKeys(Chat.Chat, [foreignKey]))).run;
        const match = existing.find((chat) => Obj.getParent(chat)?.id === agent.id);
        if (match) {
          if (modelId !== undefined && match.session?.model !== modelId) {
            Obj.update(match, (match) => {
              match.session = { ...match.session, model: modelId };
            });
            yield* Database.flush();
          }
          return {
            agent: Ref.make(agent),
            agentName: agent.name,
            chat: Ref.make(match),
            feed: match.feed,
            created: false,
          };
        }

        // Read before the new chat exists: `Agent.loadChat` resolves the agent's latest chat.
        const bindings = yield* sessionBindings(agent);
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(
          Chat.make({
            [Obj.Meta]: { keys: [foreignKey] },
            [Obj.Parent]: agent,
            name: title,
            feed: Ref.make(feed),
            instructions: agent.instructions,
            ...(modelId !== undefined ? { session: { model: modelId } } : {}),
          }),
        );
        const AiContext = yield* Effect.promise(aiContextRuntime);
        const runtime = yield* Effect.context<Database.Service>();
        const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
        yield* Effect.promise(() =>
          binder.bind({ skills: bindings.skills, objects: [...bindings.objects, Ref.make(chat)] }),
        );
        yield* Database.flush();
        return { agent: Ref.make(agent), agentName: agent.name, chat: Ref.make(chat), feed: chat.feed, created: true };
      },
      Effect.scoped,
      Effect.orDie,
    ),
  ),
);

export default handler;

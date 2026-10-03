//
// Copyright 2026 DXOS.org
//

import { Model } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { type DXN } from '@dxos/keys';
import * as AgentOperation from '@dxos/plugin-agent/AgentOperation';
import * as MemoryOperation from '@dxos/plugin-agent/MemoryOperation';
import * as ModeOperation from '@dxos/plugin-agent/ModeOperation';
import * as RelayOperation from '@dxos/plugin-agent/RelayOperation';
import * as TriggerOperation from '@dxos/plugin-agent/TriggerOperation';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

//
// The Agent playground: one agent (Kai), three people each with their own chat with it, and a
// transcript of an earlier engineering conversation the agent reads on load.
//

export const AGENT_NAME = 'Kai';

/** Panel names; each matches a seeded person's `preferredName`. */
export const PARTICIPANTS = ['Rich', 'Dima', 'Josiah'] as const;

export type Participant = (typeof PARTICIPANTS)[number];

export const TEAM_NAME = 'DXOS Eng';

export const TRANSCRIPT_NAME = 'CI triage — flaky indexer tests';

/** An earlier conversation in which Rich, Dima and Josiah work through a flaky-CI problem with Kai. */
export const TRANSCRIPT = trim`
  # CI triage — flaky indexer tests

  _#eng-ci, Monday 29 September 2026. Participants: Rich, Dima, Josiah, Kai (agent)._

  **Rich:** Kai, CI has been red on and off all week — \`echo-pipeline:test\` fails about one run in five,
  always in \`indexer.test.ts\`. Can you track this investigation for us? I want one place that knows
  where it stands.

  **Kai:** Will do. I'll keep the status and the decisions. Who owns the indexer?

  **Dima:** That's me. I looked at the failing runs this morning. It's not the test — it's a race in the
  v12 index migration. The migration rewrites the \`index_meta\` row while the index worker is already
  starting up, and both of them write it. Whoever writes second wins, and half the time the worker's
  stale cursor survives, so the test sees documents missing from the index.

  **Josiah:** That matches what I saw on EDGE last Thursday: two compute workers came up with different
  index versions after a deploy. So it's not just CI.

  **Rich:** Then this is P0. It blocks the 0.12 release on Friday 10 October. Quarantining the test is
  P1 — fine as a stopgap, but it doesn't count as the fix.

  **Dima:** Two options: retry the worker start until the versions agree, or make the migration take the
  index write lock and finish before the worker is allowed to start.

  **Josiah:** Please not the retry. It hides the race and we'll be back here in a month.

  **Rich:** Agreed — decision: the migration takes the write lock and the worker waits for it. No retry
  loop. Dima, you own the fix; Josiah, you review it.

  **Dima:** OK. I'm aiming to have the PR up Wednesday. One thing, Kai: don't page me after 6pm. If it's
  urgent in the evening, post in #indexer and I'll pick it up in the morning.

  **Josiah:** And send me review requests with a two-line summary of what changed; I review in the
  mornings, Pacific time.

  **Rich:** Kai, when the fix lands, tell Josiah so he can redeploy the EDGE workers. And keep me posted
  if the date for the PR slips.

  **Kai:** Noted: Dima owns the fix (migration takes the write lock), Josiah reviews and redeploys EDGE
  once it lands, P0 for the 0.12 release on 10 October, quarantine is P1. I'll tell Josiah when it lands,
  and I won't page Dima after 6pm.
`;

/** What the playground seeds: the people, their team and the transcript. */
export type PlaygroundSeed = {
  people: Record<Participant, Person.Person>;
  team: Organization.Organization;
  document: Markdown.Document;
};

/** Adds the people, the team and the transcript to the space, unless a previous run already did. */
export const seedPlayground = async (db: Database.Database): Promise<PlaygroundSeed> => {
  const existing = await db.query(Filter.type(Person.Person)).run();
  const person = (preferredName: Participant, fullName: string) =>
    existing.find((person) => person.preferredName === preferredName) ??
    db.add(Person.make({ fullName, preferredName }));
  const people = {
    Rich: person('Rich', 'Rich Burdon'),
    Dima: person('Dima', 'Dima'),
    Josiah: person('Josiah', 'Josiah'),
  };

  const team =
    (await db.query(Filter.type(Organization.Organization)).run()).find(({ name }) => name === TEAM_NAME) ??
    db.add(Organization.make({ name: TEAM_NAME }));
  const document =
    (await db.query(Filter.type(Markdown.Document)).run()).find(({ name }) => name === TRANSCRIPT_NAME) ??
    db.add(Markdown.make({ name: TRANSCRIPT_NAME, content: TRANSCRIPT }));
  return { people, team, document };
};

/** The refs a scripted model needs to name objects in its tool calls, filled in by {@link setupPlayground}. */
export type PlaygroundRefs = Partial<Record<Participant | 'agent' | 'team' | 'document', string>> & {
  chats: Partial<Record<Participant, string>>;
};

export type SetupPlaygroundProps = {
  db: Database.Database;
  invoker: Capabilities.OperationInvoker;
  /** Runs every chat on this model; the scripted story leaves it to the scripted service. */
  model?: DXN.DXN;
  /** Reads the transcript into the agent's facts once set up, without waiting for the extraction to finish. */
  read?: boolean;
  /** Receives the refs once the objects exist. */
  refs?: PlaygroundRefs;
};

/** Throws the operation's error, so a failed step stops the setup instead of leaving a half-built story. */
const invoke = async <I, O>(
  invoker: Capabilities.OperationInvoker,
  db: Database.Database,
  operation: Operation.Definition<I, O>,
  input: I,
): Promise<O> => {
  const { data, error } = await invoker.invokePromise(operation, input, { spaceId: db.spaceId });
  if (error || data === undefined) {
    throw error ?? new Error(`${operation.meta.key} returned nothing.`);
  }
  return data;
};

/**
 * Creates the agent through plugin-agent's operations (so it has its base skills and modes), gives
 * each person their own chat with it, and optionally starts reading the transcript.
 */
export const setupPlayground = async ({ db, invoker, model, read, refs }: SetupPlaygroundProps) => {
  const { people, team, document } = await seedPlayground(db);
  const { agent: agentRef } = await invoke(invoker, db, AgentOperation.CreateAgent, { name: AGENT_NAME });
  const agent = await agentRef.load();
  const [primary] = await db.query(Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent))).run();
  if (!(primary && Obj.instanceOf(Chat.Chat, primary))) {
    throw new Error('The agent has no chat.');
  }
  if (model) {
    // Set before the participant chats exist: they copy the primary chat's session.
    Obj.update(primary, (primary) => {
      primary.session = { ...primary.session, model };
    });
  }

  // Rich speaks in the agent's own chat; Dima and Josiah each get one.
  await invoke(invoker, db, RelayOperation.AssignChatParticipant, {
    chat: Ref.make(primary),
    person: Ref.make<Obj.Unknown>(people.Rich),
  });
  const chats: Partial<Record<Participant, string>> = { Rich: Obj.getURI(primary) };
  for (const name of ['Dima', 'Josiah'] as const) {
    const { chat } = await invoke(invoker, db, AgentOperation.EnsureParticipantChat, {
      agent: agentRef,
      person: Ref.make<Obj.Unknown>(people[name]),
    });
    chats[name] = chat.uri;
  }
  await db.flush({ indexes: true });

  if (refs) {
    Object.assign(refs, {
      agent: Obj.getURI(agent),
      team: Obj.getURI(team),
      document: Obj.getURI(document),
      Rich: Obj.getURI(people.Rich),
      Dima: Obj.getURI(people.Dima),
      Josiah: Obj.getURI(people.Josiah),
      chats,
    });
  }

  if (read) {
    // Not awaited: extraction takes as long as the model does, and the story should render meanwhile.
    void invoke(invoker, db, AgentOperation.ReadSource, {
      agent: agentRef,
      source: Ref.make<Obj.Unknown>(document),
    });
  }
};

export const PLAYGROUND_MODEL: DXN.DXN = Model.deepseekV4Pro.id;

//
// Scripted model.
//

/** What the scripted story types into each panel. */
export const SCRIPTED_PROMPTS = {
  relay: 'Kai, tell Dima the fix landed.',
  reply: 'Great, I will verify it on staging this afternoon.',
  noteTaker: 'Kai, switch to note-taker.',
  note: 'Note: the indexer migration must take the write lock before the worker starts.',
  watch: "Kai, let me know when Dima's indexer PR is up.",
  stillWorking: 'Still working on the indexer PR, it should be up tomorrow.',
  prUp: 'The indexer PR is up.',
} as const;

export const SCRIPTED_REPLIES = {
  relayed: 'I passed it on to Dima.',
  delivered: 'Hi Dima, Kai here with a message from Rich: the fix landed.',
  reported: 'Dima says she will verify it on staging this afternoon.',
  thanked: 'Thanks, I let Rich know.',
  switched: 'Switched to Note-taker mode.',
  noted: 'Noted.',
  watching: "I'll let you know.",
  acknowledged: 'Thanks, noted.',
  // Distinct from Rich's request, which quotes the outcome, so his panel shows it only once it fires.
  notified: 'Heads up: Dima says the indexer PR is up.',
} as const;

/**
 * What the scripted extractor finds in the goals scenario's turns; each quote is verbatim from one
 * message, so the end-of-turn read attributes it to its sender. Only the last matches Rich's watch:
 * his own request is a directive by Rich, and Dima's first update denies the PR is up.
 */
export const GOAL_FACTS = [
  {
    subject: "Dima's indexer PR",
    predicate: 'is',
    object: 'up',
    quote: SCRIPTED_PROMPTS.watch,
    force: 'directive',
    factuality: 'Uu',
    polarity: '+',
  },
  {
    subject: 'indexer PR',
    predicate: 'is',
    object: 'up',
    quote: SCRIPTED_PROMPTS.stillWorking,
    factuality: 'CT-',
    polarity: '-',
  },
  {
    subject: 'indexer PR',
    predicate: 'is',
    object: 'up',
    quote: SCRIPTED_PROMPTS.prUp,
    factuality: 'CT+',
    polarity: '+',
  },
] as const;

/** The first line of pipeline-rdf's extraction prompt, which is how the script tells `readSource` calls apart. */
const EXTRACTION_PROMPT = 'You extract atomic propositions';

/**
 * What the scripted extractor finds in {@link TRANSCRIPT}; each quote is verbatim from one speaker's
 * line, so `readSource` attributes the fact to them.
 */
export const TRANSCRIPT_FACTS = [
  { subject: 'Dima', predicate: 'owns', object: 'indexer', quote: "That's me." },
  { subject: 'indexer migration race', predicate: 'has priority', object: 'P0', quote: 'Then this is P0.' },
  {
    subject: 'migration',
    predicate: 'takes',
    object: 'index write lock',
    quote: 'the migration takes the write lock',
  },
  {
    subject: 'Josiah',
    predicate: 'reviews',
    object: 'indexer fix',
    quote: 'Josiah, you review it.',
    force: 'directive',
  },
  {
    subject: 'Kai',
    predicate: 'must not page after 6pm',
    object: 'Dima',
    quote: "don't page me after 6pm",
    force: 'directive',
  },
] as const;

const tool = Operation.toolName;
const { text, toolCall } = ScriptedLanguageModel;

/** The text of a prompt message's text parts. */
const messageText = (message: ScriptedLanguageModel.ScriptedRequest['prompt']['content'][number]): string =>
  typeof message.content === 'string'
    ? message.content
    : message.content.map((part) => (part.type === 'text' ? part.text : '')).join('');

/** The first ref under `field` in a tool result of `toolName`, newest result first. */
const resultRef = (request: ScriptedLanguageModel.ScriptedRequest, toolName: string, field: string) => {
  const pattern = new RegExp(`"${field}"\\s*:\\s*(?:\\{\\s*"/"\\s*:\\s*)?"([^"]+)"`);
  for (const message of [...request.prompt.content].reverse()) {
    if (message.role !== 'tool') {
      continue;
    }
    for (const part of message.content) {
      if (part.type === 'tool-result' && part.name === toolName) {
        const match = (typeof part.result === 'string' ? part.result : JSON.stringify(part.result)).match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
  }
  return undefined;
};

/** The name of the last tool whose result the request carries. */
const lastToolName = (request: ScriptedLanguageModel.ScriptedRequest): string | undefined => {
  const last = request.prompt.content.at(-1);
  if (last?.role !== 'tool') {
    return undefined;
  }
  return last.content.flatMap((part) => (part.type === 'tool-result' ? [part.name] : [])).at(-1);
};

/**
 * A turn generator rather than a fixed script: three conversations and the transcript's extraction
 * interleave in an order the play function does not control, so each turn is chosen from the request —
 * the extraction prompt, the latest user message, or the tool whose result just came back.
 */
export const makePlaygroundScript = (refs: PlaygroundRefs): ScriptedLanguageModel.ScriptedTurnGenerator => {
  let relay: string | undefined;
  return (request) => {
    if (request.text.includes(EXTRACTION_PROMPT)) {
      // Extraction runs per chunk, so each chunk reports only the facts it quotes.
      const facts = [
        ...TRANSCRIPT_FACTS.filter(({ quote }) => request.text.includes(quote)).map((fact) => ({
          ...fact,
          factuality: 'CT+',
          polarity: '+',
        })),
        ...GOAL_FACTS.filter(({ quote }) => request.text.includes(quote)),
      ];
      return { parts: [text(JSON.stringify({ facts }))] };
    }
    if (request.text.includes('Suggest a name for this chat')) {
      return { parts: [text('Playground')] };
    }

    const last = request.prompt.content.at(-1);
    const lastUser = [...request.prompt.content].reverse().find((message) => message.role === 'user');
    const said = lastUser ? messageText(lastUser) : '';

    if (last?.role === 'tool') {
      switch (lastToolName(request)) {
        case tool(RelayOperation.CreateRelay): {
          relay = resultRef(request, tool(RelayOperation.CreateRelay), 'relay');
          return {
            parts: [
              toolCall(tool(RelayOperation.SendMessage), {
                agent: refs.agent,
                recipient: refs.Dima,
                text: SCRIPTED_REPLIES.delivered,
                relay,
              }),
            ],
          };
        }
        case tool(RelayOperation.SendMessage):
          return {
            parts: [text(said.includes(SCRIPTED_PROMPTS.relay) ? SCRIPTED_REPLIES.relayed : SCRIPTED_REPLIES.thanked)],
          };
        case tool(ModeOperation.SwitchMode):
          return { parts: [text(SCRIPTED_REPLIES.switched)] };
        case tool(MemoryOperation.Remember):
          return { parts: [text(SCRIPTED_REPLIES.noted)] };
        case tool(TriggerOperation.WatchFacts):
          return { parts: [text(SCRIPTED_REPLIES.watching)] };
        default:
          return { parts: [text('Done.')] };
      }
    }

    // Each panel attributes its prompts, so the model sees who is speaking; a missing attribution
    // falls through to the plain reply and fails the play function's wait.
    if (said.includes(SCRIPTED_PROMPTS.relay) && said.includes('[From: Rich]')) {
      return {
        parts: [
          toolCall(tool(RelayOperation.CreateRelay), {
            agent: refs.agent,
            recipient: refs.Dima,
            requester: refs.Rich,
            message: 'The fix landed.',
          }),
        ],
      };
    }
    if (said.includes(SCRIPTED_PROMPTS.reply) && said.includes('[From: Dima]')) {
      return {
        parts: [
          toolCall(tool(RelayOperation.SendMessage), {
            agent: refs.agent,
            recipient: refs.Rich,
            text: SCRIPTED_REPLIES.reported,
            relay,
          }),
        ],
      };
    }
    if (said.includes(SCRIPTED_PROMPTS.noteTaker)) {
      return {
        parts: [toolCall(tool(ModeOperation.SwitchMode), { chat: refs.chats.Rich, mode: 'Note-taker' })],
      };
    }
    if (said.includes(SCRIPTED_PROMPTS.note)) {
      return {
        parts: [
          toolCall(tool(MemoryOperation.Remember), {
            content: 'The indexer migration must take the write lock before the worker starts.',
            kind: 'note',
            subjects: [refs.Rich],
            body: '- The migration takes the index write lock.\n- The worker waits for it before starting.',
          }),
        ],
      };
    }
    if (said.includes(SCRIPTED_PROMPTS.watch) && said.includes('[From: Rich]')) {
      return {
        parts: [
          toolCall(tool(TriggerOperation.WatchFacts), {
            agent: refs.agent,
            requester: refs.Rich,
            outcome: "Dima's indexer PR is up",
            when: { speaker: 'Dima', about: 'indexer PR', force: 'assertive', polarity: '+' },
            message: SCRIPTED_REPLIES.notified,
          }),
        ],
      };
    }
    // Dima's updates need no tool: the end-of-turn read records them and fires the watch.
    if (said.includes(SCRIPTED_PROMPTS.stillWorking) || said.includes(SCRIPTED_PROMPTS.prUp)) {
      return { parts: [text(SCRIPTED_REPLIES.acknowledged)] };
    }
    return { parts: [text('OK.')] };
  };
};

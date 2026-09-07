//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';

import * as ClaudeAgentSession from './ClaudeAgentSession';
import * as ClaudeManagedAgent from './ClaudeManagedAgent';

const ICON = 'ph--robot--regular';

/** Summary of an agent, as returned to the assistant by {@link ListAgents}. */
export const AgentSummary = Schema.Struct({
  id: Schema.String.annotate({ description: 'Object id of the ClaudeManagedAgent.' }),
  name: Schema.String,
  model: Schema.String,
  status: ClaudeManagedAgent.Status,
  agentId: Schema.optional(Schema.String.annotate({ description: 'Anthropic agent id, once deployed.' })),
  environmentId: Schema.optional(Schema.String),
});
export interface AgentSummary extends Schema.Schema.Type<typeof AgentSummary> {}

/** One turn of a session transcript. */
export const TranscriptMessage = Schema.Struct({
  role: Schema.Literals(['user', 'agent']),
  text: Schema.String,
});
export interface TranscriptMessage extends Schema.Schema.Type<typeof TranscriptMessage> {}

/**
 * Creates the local agent record. Deliberately does not call Anthropic: the configuration is edited
 * in the space and pushed by {@link DeployAgent}, so a half-configured agent never reaches the API.
 */
export const CreateAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.createAgent'),
    name: 'Create Claude Agent',
    description: 'Creates a Claude managed agent configuration in the current space.',
    icon: ICON,
  },
  input: Schema.Struct({
    name: Schema.NonEmptyString.annotate({ description: 'Human-readable name for the agent.' }),
    description: Schema.optional(Schema.String.annotate({ description: 'What the agent is for.' })),
    model: Schema.optional(
      Schema.String.annotate({ description: `Anthropic model id (default ${ClaudeManagedAgent.DEFAULT_MODEL}).` }),
    ),
    effort: Schema.optional(ClaudeManagedAgent.Effort.annotate({ description: 'Reasoning effort level.' })),
    systemPrompt: Schema.optional(
      Schema.String.annotate({ description: "The agent's system prompt (up to 100,000 characters)." }),
    ),
    skills: Schema.optional(
      Schema.Array(Schema.String).annotate({ description: 'Anthropic skill ids, e.g. "xlsx", "pptx".' }),
    ),
    environmentId: Schema.optional(
      Schema.String.annotate({ description: 'Anthropic environment id (env_…) sessions run in.' }),
    ),
  }),
  output: Schema.Struct({
    id: Schema.String.annotate({ description: 'Object id of the created agent.' }),
  }),
  services: [Database.Service],
  types: [ClaudeManagedAgent.ClaudeManagedAgent],
});

/** Lists the agents configured in the current space. */
export const ListAgents = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.listAgents'),
    name: 'List Claude Agents',
    description: 'Lists the Claude managed agents configured in the current space.',
    icon: ICON,
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    agents: Schema.Array(AgentSummary),
  }),
  services: [Database.Service],
  types: [ClaudeManagedAgent.ClaudeManagedAgent],
});

/**
 * Pushes the configuration to Anthropic, creating the agent on first deploy and bumping its version
 * on every later one.
 */
export const DeployAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.deployAgent'),
    name: 'Deploy Claude Agent',
    description: "Creates or updates the agent on Anthropic's servers from its stored configuration.",
    icon: 'ph--cloud-arrow-up--regular',
  },
  input: Schema.Struct({
    agent: Ref.Ref(ClaudeManagedAgent.ClaudeManagedAgent).annotate({ description: 'The agent to deploy.' }),
  }),
  output: Schema.Struct({
    agentId: Schema.String,
    version: Schema.optional(Schema.Number),
  }),
  services: [Database.Service, Credential.CredentialsService],
  types: [ClaudeManagedAgent.ClaudeManagedAgent],
});

/** Starts a session against a deployed agent, optionally with the first instruction. */
export const StartSession = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.startSession'),
    name: 'Start Claude Agent Session',
    description: 'Starts a new session for a deployed Claude managed agent and records it in the space.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    agent: Ref.Ref(ClaudeManagedAgent.ClaudeManagedAgent).annotate({ description: 'The agent to run.' }),
    message: Schema.optional(Schema.String.annotate({ description: 'First user message sent to the agent.' })),
    title: Schema.optional(Schema.String.annotate({ description: 'Title for the session.' })),
    environmentId: Schema.optional(
      Schema.String.annotate({
        description:
          "Overrides the agent's configured environment id. Omit to reuse the agent's, or to have one provisioned.",
      }),
    ),
    credentials: Schema.optional(
      Schema.Array(ClaudeAgentSession.SessionCredential).annotate({
        description: 'Credentials to bind to the run, referenced by AccessToken rather than inlined.',
      }),
    ),
  }),
  output: Schema.Struct({
    id: Schema.String.annotate({ description: 'Object id of the created session.' }),
    sessionId: Schema.String.annotate({ description: 'Anthropic session id.' }),
    environmentId: Schema.String.annotate({ description: 'Environment the session runs in.' }),
    provisionedEnvironment: Schema.Boolean.annotate({
      description: 'Whether an environment was created for this run because the agent had none.',
    }),
    boundCredentials: Schema.Array(Schema.String).annotate({
      description: 'Environment variable names bound to the run. Never the values.',
    }),
  }),
  services: [Database.Service, Credential.CredentialsService],
  types: [ClaudeManagedAgent.ClaudeManagedAgent, ClaudeAgentSession.ClaudeAgentSession, AccessToken.AccessToken],
});

/** Sends a follow-up message into a running session. */
export const SendMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.sendMessage'),
    name: 'Send Message To Claude Agent',
    description: 'Sends a user message into an existing Claude managed agent session.',
    icon: 'ph--paper-plane-tilt--regular',
  },
  input: Schema.Struct({
    session: Ref.Ref(ClaudeAgentSession.ClaudeAgentSession).annotate({ description: 'The session to send to.' }),
    message: Schema.NonEmptyString.annotate({ description: 'The message text.' }),
  }),
  output: Schema.Struct({
    sessionId: Schema.String,
  }),
  services: [Database.Service, Credential.CredentialsService],
  types: [ClaudeAgentSession.ClaudeAgentSession],
});

/** Reads back the session transcript and refreshes the stored status. */
export const GetTranscript = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.getTranscript'),
    name: 'Get Claude Agent Transcript',
    description: "Reads a Claude managed agent session's messages and its current status.",
    icon: 'ph--chat-text--regular',
  },
  input: Schema.Struct({
    session: Ref.Ref(ClaudeAgentSession.ClaudeAgentSession).annotate({ description: 'The session to read.' }),
    limit: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Maximum events to read (default 50).',
      }),
    ),
    order: Schema.optional(
      Schema.Literals(['first', 'last']).annotate({
        description:
          'Which end of the session to read: "last" (default) returns the most recent events, "first" the opening ones. Messages are returned in chronological order either way.',
      }),
    ),
  }),
  output: Schema.Struct({
    status: Schema.optional(Schema.String),
    stopReason: Schema.optional(Schema.String),
    messages: Schema.Array(TranscriptMessage),
  }),
  services: [Database.Service, Credential.CredentialsService],
  types: [ClaudeAgentSession.ClaudeAgentSession],
});

/**
 * The one way to change a running session's credentials: bind, rotate, refresh and revoke in a
 * single call. Counterpart to passing `credentials` at start — an agent that hits a 401 mid-run can
 * be fixed without restarting it, and without the secret passing through a message.
 *
 * `refresh` exists because the vault holds the resolved VALUE. The space's OAuth credentials rotate,
 * and nothing propagates a rotation into a running container, so a session that was working and now
 * gets a 401 usually holds a stale copy — `refresh: true` re-reads every credential the session
 * recorded and writes the current value back, with no need to name any of them.
 */
export const UpdateSessionCredentials = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.claude.updateSessionCredentials'),
    name: 'Update Claude Agent Session Credentials',
    description: "Binds, refreshes or revokes credentials on a running Claude managed agent's session.",
    icon: 'ph--key--regular',
  },
  input: Schema.Struct({
    session: Ref.Ref(ClaudeAgentSession.ClaudeAgentSession).annotate({ description: 'The session to update.' }),
    // Plain arrays rather than `Schema.NonEmptyArray`, which serializes to `prefixItems` — a keyword
    // the persisted-operation JSON schema does not carry, so the tool resolver could not project
    // this operation and dropped it from the model's toolkit entirely.
    credentials: Schema.optional(
      Schema.Array(ClaudeAgentSession.SessionCredential).annotate({
        description: 'Credentials to bind or rotate, matched by their environment variable name.',
      }),
    ),
    revoke: Schema.optional(
      Schema.Array(Schema.NonEmptyString).annotate({
        description: 'Environment variable names to revoke, e.g. ["GH_TOKEN"].',
      }),
    ),
    refresh: Schema.optional(
      Schema.Boolean.annotate({
        description:
          'Re-read every credential already bound to this session from the space and write the current value back. Use after an OAuth token has rotated.',
      }),
    ),
  }),
  output: Schema.Struct({
    sessionId: Schema.String,
    bound: Schema.Array(Schema.String).annotate({ description: 'Environment variable names now bound.' }),
    revoked: Schema.Array(Schema.String).annotate({ description: 'Environment variable names revoked.' }),
  }),
  services: [Database.Service, Credential.CredentialsService],
  types: [ClaudeAgentSession.ClaudeAgentSession, AccessToken.AccessToken],
});

//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { ClaudeAgentOperation } from '#types';

export const key = 'org.dxos.skill.claudeAgents';

/** Operation definitions behind the skill's tools, for hosts without a registry to resolve ToolIds. */
export const operations = [
  ClaudeAgentOperation.CreateAgent,
  ClaudeAgentOperation.ListAgents,
  ClaudeAgentOperation.DeployAgent,
  ClaudeAgentOperation.StartSession,
  ClaudeAgentOperation.SendMessage,
  ClaudeAgentOperation.GetTranscript,
] as const;

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Claude Agents',
    description: 'Configure, deploy and run Anthropic Claude managed agents from the space.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations: [...operations] }),
    instructions: Template.make({
      source: trim`
        A Claude managed agent is an agent Anthropic hosts and runs on your behalf. The space holds
        its configuration as a ClaudeManagedAgent object; Anthropic holds the deployed copy and the
        per-session container the agent works in.

        ## The shape of the flow
        Configuration and execution are separate steps, and they must happen in this order:
        1. Create Claude Agent — writes the configuration into the space. Nothing reaches Anthropic.
        2. Deploy Claude Agent — pushes that configuration to Anthropic and records the returned
           \`agentId\`. Re-run it after ANY change to the name, model, system prompt, skills or MCP
           servers; a session always runs the deployed copy, never the space's unpushed edits.
        3. Start Claude Agent Session — provisions a container and starts a run. Requires a deployed
           agent AND an environment id.
        4. Send Message To Claude Agent / Get Claude Agent Transcript — drive and read the session.

        ## Environments
        An environment id (\`env_…\`) is where sessions run and cannot be created from here — the user
        provisions it via the Anthropic Console or the \`ant\` CLI. If an agent has none, ask the user
        for it rather than guessing one; Start Claude Agent Session fails without it.

        ## Running a session
        - Sessions are asynchronous. Start Claude Agent Session returns as soon as the session exists;
          the agent keeps working afterwards. Read progress with Get Claude Agent Transcript rather
          than assuming the first response is the final one.
        - \`status\` is \`running\` while the agent works and \`idle\` when it stops. On idle, read
          \`stopReason\`: \`end_turn\` means it finished, \`requires_action\` means it is blocked
          waiting on something, \`budget_reached\` means it hit its spending cap.
        - Send Message To Claude Agent queues a message at any time; it does not wait for a reply.
          After sending, poll the transcript rather than reporting the message as answered.
        - The transcript returns only user and agent prose. Tool calls, thinking signals and status
          events are omitted, so a quiet transcript on a running session is normal.

        ## Choosing configuration
        - Default the model to claude-opus-5 unless the user names another.
        - \`effort\` (low…max) trades cost for thoroughness; leave it unset unless asked.
        - \`skills\` are Anthropic-provided skill ids such as "xlsx" or "pptx" — only add them when
          the task calls for producing that kind of file.
        - Put durable behaviour in the system prompt and per-run detail in the session message.

        ## Reporting
        Refer to agents by name, and say which step you performed. Never claim an agent is running
        after only creating it, and never claim work is complete on the strength of a session id.
      `,
    }),
  });

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as acp from '@agentclientprotocol/sdk';
import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import type * as Protocol from '../agents/Protocol.ts';
import type { AgentError } from '../errors.ts';
import { ClaudeNamespace } from '../namespace.ts';
import type * as SettingsModule from './Settings.ts';
import type * as StateModule from './State.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>()(
  `${ClaudeNamespace.key}.capability.settings`,
);

/** What the plugin keeps on this device only, such as each project's repository folder. */
export const State = Capability.makeSingleton<Atom.Writable<StateModule.State>>()(
  `${ClaudeNamespace.key}.capability.state`,
);

/**
 * Where the page starts coding agents, since it cannot spawn processes itself: the desktop app's `dx-agent` sidecar,
 * or a Vite dev server's agent route. The agents and their protocol are the same on either.
 */
export type AgentHelper = {
  /** The agents the helper can launch, and whether each can run on this machine. */
  readonly agents: Effect.Effect<readonly Protocol.AgentStatus[], AgentError>;
  /** Where agents work when the chat's project names no folder: a dev server's own checkout; none in the desktop app. */
  readonly defaultFolder: Effect.Effect<string | undefined, AgentError>;
  /** Starts an agent working in `cwd`, with `mcpToken` in its environment, and returns its ACP connection. */
  readonly connect: (agent: string, cwd: string, mcpToken?: string) => Effect.Effect<acp.Stream, AgentError>;
  /** Git worktrees in the app's data folder, which delegated chats work in. */
  readonly worktrees: {
    /** The worktree for `key`, created on first use; a folder that is not a repository is returned as is. */
    readonly ensure: (request: Protocol.WorktreeRequest) => Effect.Effect<Protocol.Worktree, AgentError>;
    /** Removes a worktree, keeping its branch; one with uncommitted changes is kept (`dirty`). */
    readonly remove: (key: string) => Effect.Effect<Protocol.WorktreeOutcome, AgentError>;
    readonly list: Effect.Effect<readonly Protocol.Worktree[], AgentError>;
  };
  /** MCP servers the page serves to agents, through the helper. */
  readonly mcp: {
    /** Serves `handle` under `server` to an agent presenting `token`; returns the URL it reaches it at. */
    readonly serve: (server: string, handle: McpHandle, token: string) => Effect.Effect<{ url: string }, AgentError>;
    readonly close: (server: string) => Effect.Effect<void>;
  };
};

/** Answers one HTTP request an agent made of an MCP server the page serves. */
export type McpHandle = (request: Request) => Promise<Response>;

export const AgentHelper = Capability.makeSingleton<AgentHelper>()(`${ClaudeNamespace.key}.capability.agentHelper`);

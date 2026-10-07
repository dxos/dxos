# @dxos/plugin-claude

Claude integration for Composer, including Claude Code as a chat's agent.

## End-to-end tests

`src/e2e/ClaudeCode.e2e.test.ts` runs chats that name the Claude Code process through `AgentService`.
The process starts the real ACP adapter through `ShellService` and drives the real Claude Code on the
Anthropic API. It spends tokens, so it is tagged `manual`: CI never runs it and it does not gate PRs.
Run it by hand with a `claude setup-token` token or an API key:

```bash
DX_RUN_MANUAL_TESTS=1 DX_CLAUDE_CODE_OAUTH_TOKEN=<token> moon run plugin-claude:test -- src/e2e
```

| Variable                     | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `DX_RUN_MANUAL_TESTS`        | `1` selects `manual` tests.                                   |
| `DX_CLAUDE_CODE_OAUTH_TOKEN` | A `claude setup-token` token, connected in the chat's space.  |
| `DX_ANTHROPIC_API_KEY`       | An API key, used when there is no token; skips without both.  |
| `DX_E2E_MODEL`               | Model the agent runs on (`ANTHROPIC_MODEL`); its default else. |
| `DX_E2E_CLAUDE_ACP_VERSION`  | `@agentclientprotocol/claude-agent-acp` release under test.   |

It needs `npm` (the adapter is installed into a temporary directory) and `ps`. The agent runs with
a temporary `HOME` and no inherited `ANTHROPIC_*` or `CLAUDE_*` variables, so neither your Claude Code settings nor a Claude
Code session the suite is started from take part.

What it covers, all on this machine:

- **Turns**: a chat that names the Claude Code process runs on it; follow-ups reuse the same agent and
  conversation; a prompt sent mid-turn waits for the turn to end.
- **Workspace and permissions**: the agent works in the chat's workspace, asks before writing, and
  writes only when a person allows it.
- **Process lifetime**: the agent and everything it started end with the chat's process; an agent that
  dies is replaced and the conversation continues.
- **Composer's MCP tools**: the agent reaches Composer's MCP surface with the token from its
  environment and reads the chat's space.
- **Task management**: over MCP the agent loads the project skill, creates a task, claims it for its
  session, asks a question that blocks the task, acts on the answer, attaches an artifact and
  records its session. Each step is checked in the database before the next.

The MCP tests serve Composer's MCP surface (`ComposerMcp.handler`, as `CodeAgent` serves it) on a
loopback port in place of the desktop app's helper relay, and bind the chat's space in the
workspace's `.agents/projects/space.yml`, as a project's code folder does: the project skill reads
that binding before any call, and Composer's surface has no `whoami` to find the space otherwise.

Flows that depend on unfinished work (EDGE sandboxes, registry lookup, `ShellService` on Tauri and
the vite dev server) are listed as `todo` in the suite and are filled in as that work lands.

# `dxos` Plugin — Design

## What this is

A general development utility for coding agents: durable project and task
tracking that survives context resets. Extracted from DXOS's repo-local
`/project` command and `task-planning` skill, both of which were already
generic — they just weren't packaged.

Explicitly **not** a DXOS SDK plugin. ECHO, Composer UI, Effect and the rest stay
out; a customer installing `dxos` gets workflow tooling, nothing about building on
DXOS.

## Why a plugin rather than dotfiles

Dotfiles distribute to one person's machines. A plugin distributes to a team and
to customers, with versioning and updates. The cost is namespacing — plugin
components are always `/<plugin>:<command>` — which is why the name is `dxos` and
not `agent-directives`: `/dxos:project` is 13 characters, `/agent-directives:project`
would be 25 and would undo the ergonomics the command exists for.

The hook also accepts bare `/project`, so the muscle memory built up in this repo
keeps working.

## The storage seam (the load-bearing decision)

Phase 2 replaces the file registry with the Composer MCP server. Before this
extraction, the store was baked into the directive text — every verb literally
said _"Operate on `.agents/projects/registry.yml`"_. Swapping the backend would
have meant rewriting all seven directives plus the skill.

So the directives now state the **operation** only, and one resolver appends a
**`BACKEND:`** line stating the **mechanism**:

```
TASK-PLANNING PROJECT DIRECTIVE: /dxos:project list — render the active projects…
BACKEND: file · `.agents/projects/registry.yml` — read/write it as YAML per the
         registry schema in the task-planning skill.
```

Phase 2 changes `resolve_backend` and that second line becomes an MCP tool call.
The verbs, `commands/project.md`, and `SKILL.md` never change.

Two consequences worth keeping:

- The resolver already reports a **missing** store as a distinct state, with
  instructions not to invent entries. That is exactly the shape an unreachable
  MCP server needs.
- An **unrecognised** backend refuses to guess rather than silently falling back.
  Phase 2 should decide deliberately whether `mcp` degrades to `file`.

## Why the hook, not the command body

A slash command's expansion arrives _after_ the turn has begun and can only ask
the agent to comply. `UserPromptSubmit` carries the **raw typed text** and fires
one step earlier, so the directive is injected deterministically. The command
file exists for autocomplete and defers entirely to the directive.

This was discovered while building the predecessor: the original plan called for
a `UserPromptExpansion` hook, on the premise that a command cannot act before its
own expansion. That premise was wrong one event earlier in the lifecycle.

## Why first-line anchoring

The predecessor `$project` sentinel matched anywhere in a message, so prose about
the command fired it — including, on 2026-08-04, the message asking for it to be
converted. `grep -E` applies `^` per line, so anchoring alone is insufficient;
the hook takes `head -1` of the prompt first.

## Split between hook and skill

- **Hook** — per-verb mechanics. Only fires when a command is typed.
- **Skill** — the `TASKS.md` convention, the registry schema, and the handoff
  steps. Loads on its own when work spans several steps or a session resumes,
  i.e. when _nobody_ has typed a command.

That division is why the skill was not folded into the directives: doing so would
drop the discipline for every session that never invokes the command.

## Phase 4 end-state: the plugin as a thin MCP client

Once the Composer backend is trusted (Phase 2 round-trip green), the plugin stops carrying the
workflow and starts pointing at it. The canonical skill is `plugin-projects`'
`skills/project/project-skill.md`, renamed from `codeProject` to `project` — that name was only ever
a prompt-collision workaround against assistant-toolkit's `org.dxos.skill.project`, which Phase 4
absorbed (its two artifact ops joined the consolidated skill) to free the name.

Where each hook job goes:

- **Trigger matching** — `/dxos:project` is handled natively by the command file; only bare
  `/project` irreducibly needs a hook (raw-text access). Keep a ~15-line matcher, or retire the
  bare form and delete the hook.
- **Verb parsing / arg sanitising** — replaced by the server's typed tool schemas; regex-scrubbing
  prose gives way to the MCP layer validating structured inputs.
- **Per-verb directives** — the canonical skill markdown, delivered deterministically by command
  expansion (short invariants) + `skillLoad`/the MCP prompt (deep how-to).
- **Backend resolution** — dissolves. Space binding moves into `dx mcp serve` (space.yml /
  `DX_PROJECT_SPACE`); "store missing" becomes a typed tool error instead of a shell `stat`. The
  no-fallback invariant survives as one line in the stub: tools absent → say so and STOP.

The determinism the hook was built for is relocated, not lost: today's fragile middle — the model
hand-editing YAML per prose instructions — is exactly the part that disappears. And the hook is
already dead in the cloud sandbox, so everything moved out of it starts working in remote sessions.

Bridge before cutover: two distinguishable surfaces (file stays the daily driver, the space-backed
`project` skill dogfoods under its own name), optionally per-project store ownership for gradual migration, and
`DX_PROJECT_BACKEND` as the kill switch throughout. Never dual-write. The offline story (read-only
generated mirror vs nothing) must be decided before the `file` branch is deleted — it is the one
irreversible UX regression in an otherwise mechanical cleanup.

## Open questions

1. **`/mode`** — equally generic, same hook mechanism, currently repo-local. It
   would fit this plugin, but was out of scope for the extraction.
2. **`.agents/` as the default registry directory** — a reasonable cross-tool
   convention, but it is a DXOS habit. Overridable via `DX_PROJECT_REGISTRY`;
   worth revisiting if customers expect something else.
3. **Multi-repo projects** — the registry is per-repo. A work-stream spanning
   repos has no home today; the Composer backend is the natural answer.

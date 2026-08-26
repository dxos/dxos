---
name: plugin-discovery
description: >-
  Search the plugin catalog — including plugins that are NOT installed — and offer them
  to the user as an inline install card. Use whenever a capability the task needs might
  live in a plugin (a slash command, skill bundle, hook, or agent); when the user asks
  what plugins exist, whether there is a plugin for X, or to install/enable one; or when
  nothing in the session covers the task and a catalog plugin plausibly would.
---

# Plugin discovery

Find and offer plugins the session does not have yet. The catalog holds far more than the
enabled set, so "no skill covers this" is never a conclusion until you have searched it.

## Tools

All three are **deferred** — load their schemas before the first call:

```
ToolSearch: select:SearchPlugins,ListPlugins,SuggestPluginInstall
```

| Tool | Use for |
| --- | --- |
| `SearchPlugins` | Keyword search over the whole claude.ai catalog, installed or not. Returns `id`, `name`, `description`, enabled flag, and the skills each plugin ships. |
| `ListPlugins` | Only what is already enabled. For "what do I have?" and for confirming an install landed. |
| `SuggestPluginInstall` | Renders the inline install card the user clicks to enable. |

`SuggestPluginInstall` is the only way to enable a plugin from here — there is no
install tool, and editing `enabledPlugins` in `.claude/settings.json` by hand does not
install anything (see below).

## Workflow

1. **Restate the need as keywords, not as the plugin's name.** The user rarely knows what
   a plugin is called. Search intent — 2–5 phrases covering synonyms and the adjacent
   domain: "deploy this to prod" → `["deploy", "release", "ci/cd", "rollout"]`.
2. **`SearchPlugins`** with those keywords. Widen once with different words if the first
   pass is empty; a single narrow miss is not an absent capability.
3. **Filter honestly.** Keep results whose description actually covers the task. Drop
   near-misses — a wrong suggestion costs more than none.
4. **Check the enabled flag.** Already enabled → just use it (or point the user at its
   command); no card. Enabled-but-unused is the common case when a search "finds nothing
   new".
5. **`SuggestPluginInstall`** for the surviving not-enabled plugins. Pass `pluginId`,
   `pluginName`, `description`, and `skills` **verbatim from the search result** — do not
   paraphrase, and never invent an id. Set `contextLabel` to a short phrase tying the card
   to the request ("For deploying to prod").
6. **Say nothing about the plugins in prose.** The card is the UI. One line of context at
   most; listing the same plugins in text duplicates the card.
7. **After the user engages**, `ListPlugins` confirms what actually got enabled — then
   continue the original task with it.

## When not to suggest

- The task is answerable now, and a plugin would only be tangential.
- You already rendered a card this conversation and the user ignored it. One offer, then
  drop it.
- You are unsure it would help. Proceed with the task; if the search found nothing worth
  offering, do not mention that you searched.
- The user asked a plain question about their existing setup — that is `ListPlugins`.

## Skills vs. plugins

A plugin is a bundle; skills are what it ships. For a standalone skill not tied to a
plugin, the sibling tools are `SearchSkills` / `ListSkills` / `SuggestSkills` (also
deferred). Search both when the need is capability-shaped rather than
workflow-shaped — a lone skill often beats pulling in a whole plugin.

## DXOS repo specifics

- **Repo-local plugins** (e.g. `tools/claude/plugins/dxos`) are not in the claude.ai
  catalog and will never appear in `SearchPlugins`. They are wired through
  `extraKnownMarketplaces` + `enabledPlugins` in `.claude/settings.json`, and **enabling
  is not installing**: `bash .claude/scripts/bootstrap-plugins.sh` must run once per
  machine and once per cloud container. If a repo command answers `Unknown command`, that
  bootstrap is the fix — not a catalog search.
- Repo skills live in `.agents/skills/*` (`.claude/skills` is a symlink to it) and load
  by description, so they are always discoverable without any install step.
- Never edit `enabledPlugins` to "install" a catalog plugin for the user; render the card
  and let them choose.

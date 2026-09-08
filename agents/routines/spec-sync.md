# Routine: spec sync — reconcile `PLUGIN.mdl` with the code

A Claude Code cloud Routine (or a one-off remote session) that brings a plugin's `PLUGIN.mdl` back
into line with its source, so the specs stop drifting and the QA tests reference operations that
exist. Two modes, one prompt:

| Mode        | When                                   | Selection                                                 |
| ----------- | -------------------------------------- | --------------------------------------------------------- |
| incremental | daily, or after each PR lands on main  | plugins whose `src/` changed since the last recorded sync |
| sweep       | by hand, until every plugin is current | the next batch of `N` plugins in alphabetical order       |

State lives in the repo, so either trigger works from a fresh session: `.agents/spec-sync.yml`
records the `main` commit each plugin was last reconciled against. The Routine commits that file
with the specs it changed, on its own branch, and opens one PR per run.

Why a routine and not a build step: the mapping from code to spec is not mechanical. One runtime
operation is a `key:` to backfill; a design-level `op` with no runtime counterpart is a decision to
record (`status: unimplemented`), not delete; and a `scenario` whose behaviour moved is prose to
rewrite. Each of those is a judgement the code alone does not settle, which is exactly the loop
`packages/reflect/deus/docs/DESIGN.md` §Round-Trip describes.

## Trigger configuration

- **Environment:** the repository's cloud environment (setup command
  `bash .config/claude-code-setup.sh`; the sync reads sources only, so a sandbox whose toolchain
  fails to install still works for everything but the final typecheck).
- **Schedule:** daily, `0 5 * * *` UTC, fresh session per fire; a sweep is fired by hand with the
  text `sweep 8` appended.
- **Prompt:** the block below, verbatim.
- **Outcome:** one PR per run, `spec-sync: <plugins>`; nothing is pushed to `main`.

Registering the trigger is tracked in `packages/reflect/deus/TASKS.md`.

---

```text
Reconcile Composer plugin specs with their code. Work autonomously — nobody is watching, so do not
ask questions; when a judgement is needed, make it, record it in the PR body, and move on.

You are in the Claude Code cloud sandbox: read `.agents/skills/cloud-sandbox/SKILL.md` first, then
`packages/reflect/deus/docs/DESIGN.md`, `packages/reflect/deus/lang/qa.mdl` (the `op@1.1` section
and the naming: `scenario` is given/when/then, `test` is executable), and
`.agents/skills/composer-plugins/SKILL.md` §`PLUGIN.mdl`. The template is
`packages/reflect/deus/lang/PLUGIN-.template.mdl`; `packages/plugins/plugin-markdown/PLUGIN.mdl`
is the reference for a current spec.

Mode and selection:

1. Read `.agents/spec-sync.yml` (`main: <sha>`, `plugins: { <name>: <sha> }`). Create it if absent.
2. INCREMENTAL (the default): `git fetch origin main` and list plugins whose
   `packages/plugins/plugin-<name>/src` changed between the recorded `main` sha and `origin/main`
   (`git diff --name-only <sha> origin/main -- 'packages/plugins/*/src'`). Skip plugins with no
   `PLUGIN.mdl`; list them in the PR body as unspecified. No changes → reply "nothing to sync" and
   stop without a PR.
3. SWEEP (the message says `sweep N`): take the first N plugins, alphabetical, whose recorded sha is
   absent or older than 30 days.

Per plugin, in order, with one subagent per plugin when more than three are selected:

4. Inventory the code, not the spec: every `Operation.make` (`meta.key`, `input`, `output`,
   `services`), every ECHO type (`Type.Obj`/`Schema` definitions with a typename), every surface
   contribution (`createSurface` role + filter), every app-graph node contribution, the plugin's
   `meta.id`. `packages/reflect/introspect` can answer these for the whole plugin; grep is fine.
5. Rewrite the spec's structural sections to mirror the code:
   - `## Operations`: one `op` block per runtime key, with `key:` and `requires:` from the code and
     `input`/`output` from the schemas. Keep a design-level op that has no runtime counterpart, but
     without `key:` and with `status: unimplemented`. Remove nothing silently: an op that left the
     code is deleted from the spec and named in the PR body.
   - `## Types`, `## Components`, `## Surfaces` (app dialect blocks where the plugin uses them):
     same rule — the code is the truth about what exists; the spec's prose is the truth about why.
   - Leave `## Features` and `scenario` blocks as they are unless a requirement is now impossible
     (its operation or type is gone); then mark the `req`/`scenario` with a `status: stale` comment
     rather than rewriting intent you cannot verify.
6. In `## QA`, every `test` that references an operation whose key, input or output changed gets
   `status: unverified  # <date>, spec-sync: <what changed>`. Do not run tests here; that is the QA
   Routine's job.
7. Ensure the Extensions table declares every block type the document uses, with the current
   URIs (`scenario`, `test`, `step`, `suite`, `op@1.1`), and that the inline `ext` definitions in the
   appendix match `packages/reflect/deus/lang/*.mdl` — copy, do not invent.
8. Record `plugins.<name>: <origin/main sha>` in `.agents/spec-sync.yml`; after the last plugin set
   `main:` to that sha.

Then:

9. `node tools/claude/plugins/dxos/scripts/list-tests.mjs` must still list every test; run
   `node tools/qa-lint/qa-lint.mjs` and `node tools/qa-lint/teardown-lint.mjs` and fix what they
   report in the specs you touched. Run `pnpm format`.
10. Commit as `spec-sync: <plugin>, <plugin>, …` and open one PR with the `submit-pr` skill. The
    body lists, per plugin: keys backfilled, ops added / removed / marked unimplemented, types and
    surfaces changed, tests marked unverified, and any judgement you made that a human should
    check. A defect you notice in the code is reported in the body, not fixed.
```

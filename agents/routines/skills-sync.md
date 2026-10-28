# Routine: skills sync — keep installed copies of dxos skills in step

A Claude Code cloud Routine (or a one-off remote session) that keeps the skills other repos install
from here (`npx skills add dxos/dxos --skill <name>`) in step with their source, in both
directions. Today the only consumer is `dxos/edge`, and the only skill it installs is
`agentic-review`.

dxos is upstream: a skill is changed here and the consumer copies follow. A consumer's copy is
still a committed folder, though, so someone can edit it in place. An update would silently erase
that edit, because `npx skills update` reinstalls over the folder whenever the upstream hash moved.
So each run first finds such edits and takes them upstream, and updates a consumer only when its
copy holds nothing that dxos lacks.

`scripts/skills-sync.ts` makes the decision deterministic. The consumer's `skills-lock.json`
records each skill's content hash at install time; the script compares that hash with the installed
folder and with the source at `origin/main`:

| State      | Installed copy | Upstream | What the run does                                                |
| ---------- | -------------- | -------- | ---------------------------------------------------------------- |
| `in-sync`  | as installed   | same     | nothing                                                          |
| `behind`   | as installed   | moved    | PR in the consumer: `npx skills update`                          |
| `edited`   | changed        | same     | PR in dxos taking the edit upstream; consumer left alone         |
| `diverged` | changed        | moved    | PR in dxos taking the edit upstream (3-way); consumer left alone |

After an upstream PR lands, the next run sees the consumer as `behind` and updates it, which
replaces the edited copy with the upstream version that now contains the edit.

## Trigger configuration

- **Environment:** a cloud environment with both `dxos/dxos` and `dxos/edge` as sources, checked
  out side by side. No toolchain is needed beyond `node`, `bun` and `git`.
- **Schedule:** daily, `41 4 * * *` UTC, fresh session per fire.
- **Prompt:** the block below, verbatim.
- **Outcome:** at most one draft PR per repo per run; nothing is pushed to `main`. A run with
  nothing to do opens nothing.

---

```text
Keep the skills dxos/edge installs from dxos/dxos in step with their source. Work autonomously —
nobody is watching, so do not ask questions; when a judgement is needed, make it, record it in the
PR body, and move on.

You are in the Claude Code cloud sandbox: read dxos/.agents/skills/cloud-sandbox/SKILL.md first.
dxos is the upstream for every skill below; edge only installs copies. Never edit a copy under
edge/.agents/skills/<name>/ by hand, and never update a copy that holds local edits.

1. Fetch: `git -C dxos fetch origin main` and `git -C edge fetch origin main`. The script searches
   dxos history for the commit each copy was installed from, so deepen a shallow clone first:
   `git -C dxos fetch --deepen=500 origin main`.
2. Classify: `bun dxos/scripts/skills-sync.ts --consumer edge --ref origin/main --patch-dir
   <scratchpad>/patches --json`. Exit 0 means every skill is in sync: reply "nothing to sync" and
   stop without a PR.
3. For every skill that is `edited` or `diverged`, take the edit upstream first. Work in dxos, on
   top of origin/main:
   - `git apply -3 <patch>`. Resolve any conflict by keeping both intents.
   - Make the change fit every consumer. The skill folder is the engine and is identical in every
     repo, so anything specific to edge moves out of it: a rule goes in edge's `.agents/rules/`,
     an edge-only path or example becomes a generic one or a link. If the whole edit is
     edge-specific, open no dxos PR for it; open an edge PR that moves it out of the copy
     instead, and say why.
   - List the edge commits that touched the copy since it was installed
     (`git -C edge log --format='%h %s' -- .agents/skills/<name>`), and credit them in the PR body.
   - Run the skill's own tests when it has them (`bun test ./.agents/skills/<name>`), then
     `pnpm format` when the toolchain is installed.
   - Open one draft PR in dxos/dxos titled `<name>: take edge's local changes upstream`. If an
     open PR with that title exists from an earlier run, push to its branch instead.
   - Do NOT update the edge copy in this run, even if it is also behind: an update would erase the
     edit before the upstream PR lands. The next run after the merge updates it.
4. For every skill that is `behind` (and only those), update edge:
   - In edge: `npx -y skills@1.7.4 update <name> -p -y` for each such skill.
   - `git -C edge status --short` must show changes only under `.agents/skills/<name>/` and in
     `skills-lock.json`. Anything else means the CLI did something unexpected: revert it, stop,
     and report it.
   - Re-run step 2's command: the updated skills must now be `in-sync`.
   - Run the skill's own tests in edge when it has them (`bun test ./.agents/skills/<name>`).
     For `agentic-review`, also run `bun .agents/skills/agentic-review/scripts/prepare.ts
     --pr-only --base=origin/main` in edge, check that it discovers edge's rules, then delete the
     store it wrote under `.agents/reviews/`.
   - Open one draft PR in dxos/edge titled `chore(skills): update <names> from dxos/dxos`, whose
     body names the dxos commits the update brings in (`git -C dxos log --format='%h %s'
     <base>..origin/main -- <skill dir>`, where `<base>` is the `base` step 2 reported: the commit
     the old copy was installed from).
5. A skill reported `missing` or `no-skill-path` is reinstalled the same way as `behind`, with
   `npx -y skills@1.7.4 add dxos/dxos --skill <name> -a codex --copy -y`.
6. Reply with one line per skill: its state and the PR you opened, if any.
```

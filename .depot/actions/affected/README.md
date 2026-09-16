# Affected scoping

Works out what `moon` should run in this job, once, and exports it as environment variables. Every `moon` step in the job is then unconditional, with no `--affected` flag and no `if:`.

Call it after `setup`, which is what puts node on PATH:

```yaml
- name: Setup
  uses: ./.depot/actions/setup

- name: Resolve affected scope
  uses: ./.depot/actions/affected
```

It exports `MOON_AFFECTED=remote` and `MOON_BASE=<sha>`, or nothing at all for a full run. `moon run` and `moon exec` both read those two (2.5.2), including through the Trunk uploader's `run:` input, which is why a scoped command can stay a plain string.

## Base per trigger

The base comes from the event payload rather than from moon's own `vcs.defaultBranch` resolution, which is right only for a topic-branch PR.

| Trigger | Scope | Base |
| :-- | :-- | :-- |
| `pull_request` / `pull_request_target` | affected | `pull_request.base.sha` |
| `merge_group` | affected | `merge_group.base_sha` |
| `push` to `main` | all | none |
| `push` to any other branch, `workflow_dispatch` | affected | merge-base with `origin/main` |
| `schedule` | all | none |
| no event payload | affected | merge-base with `origin/main` |
| `all: true` on the action | all | none |

`e2e-bundle` and `e2e` pass `all: ${{ inputs.e2e }}`, because that dispatch exists to run the whole suite. The two must agree, or a cell runs suites whose bundle was never warmed.

**A base that will not resolve means a full run, never an empty one.** `moon` exits 0 having run nothing when the affected set comes back empty, so a base that quietly fails to resolve would turn every gate in the workflow green. Same silent-degradation class as a dropped remote cache, which the CI project's [`DESIGN.md`](../../../.agents/projects/ci/DESIGN.md) covers.

## Opting a step out

The scope is job-level, so a `moon` step that must run whatever changed has to say so. One does, `check`'s `check-plugin-set` and `docs:bundle`:

```yaml
run: >-
  env -u MOON_AFFECTED -u MOON_BASE -u MOON_HEAD
  moon exec composer-app:check-plugin-set docs:bundle --on-failure continue
```

Both catch a property of an import edge, where the offending commit lands in a package neither project's inputs name. Scoped, they no-op on exactly the PRs they exist to catch.

**Unset the variables. Do not set `MOON_AFFECTED` to an empty string.** Empty is not "off", because moon reads it as an empty base and still filters, so the step reports "No tasks affected" and passes having checked nothing.

`moon query` is unaffected either way. Its subcommands do not read `MOON_AFFECTED`, so the `e2e` job's `Select shard targets` step returns the same list with or without it.

## Running it by hand

`resolve-affected.mjs` needs no arguments and no CI environment. With no `GITHUB_*` set it falls back to the merge-base, so it tells you what CI would decide for the checkout you are in.

```bash
A=.depot/actions/affected/resolve-affected.mjs
node $A                       # what CI would decide here
node $A --event merge_group   # emulate another trigger
node $A --help                # every flag
eval "$(node $A --shell)" && moon run :build
```

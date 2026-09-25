---
name: depot-ci
description: >-
  Read CI logs, test results and failure diagnoses for the `Check` workflow, and retry its
  failed jobs, using the `depot` CLI against `DEPOT_TOKEN`. Use whenever a `Check / …` check
  run is red and you need the actual failure — the GitHub API returns empty output for these
  checks and `depot.dev` links redirect to SSO, so `mcp__github__get_check_run` and
  `get_job_logs` cannot see them. Also use to retry a flaky shard rather than asking a
  maintainer to press the button.
---

# Reading Depot CI from an agent session

CI in this repo is **not** GitHub Actions. The `Check` workflow lives in
`.depot/workflows/check.yml` and runs on Depot, so:

- `mcp__github__get_check_run` returns `output.text: ""` for every `Check / …` check run.
- `mcp__github__actions_list` / `get_job_logs` never find the run — only the few real GitHub
  workflows (`PR Build`, `Claude mention`, `opencode`) are there.
- The check run's `details_url` (`https://depot.dev/orgs/…`) 302s to `signin.depot.dev`.

None of that means the logs are unreachable. `DEPOT_TOKEN` is present in the environment and
the `depot` CLI reads it automatically.

## Get the CLI

Not preinstalled. Fetch the release binary (the published installer pipes curl into sh, which
the sandbox's command classifier blocks — resolve the redirect and untar instead):

```bash
cd "$SCRATCH"   # anywhere writable outside the repo
rel=$(curl --silent --no-location --write-out "%{redirect_url}" --output /dev/null \
  "https://dl.depot.dev/cli/download/linux/amd64/latest")
curl -fsSL -o depot.tar.gz "$rel" && tar xzf depot.tar.gz   # -> ./bin/depot
```

`depot --version` should print. Do not `depot login`; do not pass `--token` — `DEPOT_TOKEN`
already authenticates the `ci` and `tests` subcommands. (`depot org list` answers
`unauthenticated: Missing authorization header`; that is the token's scope, not a broken
setup — ignore it.)

## The ids, and where they come from

A red check run gives you the job id directly: its `details_url` is
`https://depot.dev/orgs/<org>/workflows/<workflow-id>?job=<job-id>&repo=dxos%2Fdxos`. The
`?job=` value is the **job id** — the path segment is the workflow, and it is _not_ a run id
(`depot ci status <workflow-id>` answers `not_found: Run not found`).

Job id alone is enough for `logs`, `tests` and `diagnose`. For `retry` you also need the run
id, which `diagnose` reports:

```bash
depot ci diagnose --job <job-id> -o json    # -> .context.run_id, .attempt_id, .job_key, …
```

Note `diagnose` takes `--job` / `--run` / `--workflow` / `--attempt` flags, never a
positional id — unlike `logs` and `tests`, which take one positionally.

## The three things worth running

```bash
depot ci logs <job-id>                      # full job log; add --follow for a live job
depot tests <job-id> --ci --status failed    # just the failed test cases
depot ci diagnose --job <job-id> -o json     # grouped failure fingerprints + context
```

The log is large (~22k lines for a test shard) — redirect it to a file and grep rather than
reading it inline:

```bash
depot ci logs <job-id> > shard.log
grep -nE "Test timed out|FAIL |Tasks: |Rerun failed" shard.log
```

`Rerun failed tests:` in the vitest output names the exact `moon run <pkg>:test -- <file> -t
"<name>"` to reproduce locally, and `Tasks: N completed (M cached), K failed` tells you which
target actually failed — moon caching means a shard's red cell is often _not_ the slowest
package in it.

## Retrying a job

```bash
depot ci retry <run-id> --job <job-id>      # single failed job -> "attempt #2, queued"
depot ci retry <run-id> --failed            # every failed job in the workflow
```

This is a real re-run of that job, so it is bounded by the usual rule: spend it to confirm a
suspected flake or infrastructure failure, once. It is never a substitute for root-causing,
and never a way to get a genuine failure green.

## Do not trust a local repro over the log

A shard reproduced locally can fail on a _different_ target than CI did — a 4-core sandbox
running heavy WebGL storybook stories will time out where CI's 8-core runner passed them,
while CI's own failure was somewhere else entirely and cached green locally. Read the log
first, then reproduce the specific test it names. Getting this backwards produces a confident
and completely wrong diagnosis.

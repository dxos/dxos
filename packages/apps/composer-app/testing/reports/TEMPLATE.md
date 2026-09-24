# QA run — `<suite or plugin:QA-n>` — <YYYY-MM-DD HH:MM UTC>

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Selection   | `--suite <name>` / `--tag <tag>` / `<plugin> QA-n`                   |
| Branch      | `<branch>` at `<short sha>` (`main` at `<short sha>`)                |
| Started     | `<ISO-8601 UTC>`                                                     |
| Environment | `local` / `cloud-sandbox`; Node `<version>`; `<os>`                  |
| Server      | `moon run composer-app:serve-qa` on `<url>`                          |
| Profile     | disposable dev profile on that origin, headless Chromium             |
| Run id      | `<runId>`                                                            |
| Result      | **pass** / **FAIL** / **blocked** — `<n>/<m>` tests, `<p>/<q>` steps |

## `<plugin>:QA-n` — <title>

Status: **pass** / **FAIL** / **blocked** / **not run** — `<p>/<q>` steps.

| Stage  | Step | Name | Result | Observed               |
| ------ | ---- | ---- | ------ | ---------------------- |
| before | 1    |      | pass   |                        |
| steps  | 1    |      | pass   |                        |
| steps  | 2    |      | FAIL   | expected …, observed … |
| after  | 1    |      | pass   |                        |

Errors drained after each step (empty when none):

| Stage.step | Message | File |
| ---------- | ------- | ---- |

Coalesced steps, if any: `steps 1+2` — reason.

`after`: ran / skipped — what remains, by name, and the `--stage=after` command that removes it.

## Findings

- Defects in the app, each as `<plugin>:QA-n.<step>` with expected and observed side by side.
- Places the spec was wrong about the app, and what was changed in the spec (with the new `status:`).

## Server log

Anything relevant from the serve task's output and the browser helper's `[page]` lines (build
errors, 500s, uncaught exceptions).

# QA run — `<script>` — <YYYY-MM-DD HH:MM>

| Field    | Value                                       |
| -------- | ------------------------------------------- |
| Script   | `testing/scripts/<script>.md`               |
| Chapters | 1                                           |
| Branch   | `<branch>` at `<short sha>`                 |
| Server   | `moon run composer-app:serve-qa` on `<url>` |
| Profile  | disposable dev profile on that origin       |
| Run id   | `<__qa.runId>`                              |
| Result   | **pass** / **FAIL** — `<n>/<m>` steps       |

## Chapter 1: <title>

| Step | Name | Result | Observed               |
| ---- | ---- | ------ | ---------------------- |
| 1    |      | pass   |                        |
| 2    |      | FAIL   | expected …, observed … |

Errors drained after each step (empty when none):

| Step | Kind | Message |
| ---- | ---- | ------- |

Teardown: ran / skipped — what remains, by name, and how to remove it.

## Findings

- Defects in the app, each with the step that exposed it and the observed value.
- Places the script was wrong about the app, and what was changed in the script.

## Server log

Anything relevant from `preview_logs` or the serve task's output (build errors, 500s).

---
'@dxos/cli': minor
---

`dx eval` runs a program against a space in the code-mode dialect a Composer agent writes for its `eval` tool (`--dialect effect`, the default, or `plain`), and prints the same text the tool would return; a failing program exits non-zero. The program is an argument, `--file`, or stdin; `--skill` binds the operations it may invoke (every skill by default), and `--instructions` prints the dialect's API reference. `@dxos/agent-code-mode` exports `evaluate`, `projectOperations` and `describeTypes` for hosts that run code mode outside a turn.

---
description: Run a Composer QA script (packages/apps/composer-app/testing/scripts) through the debug port and write a report
argument-hint: '[script|number] [chapter]'
allowed-tools: Bash, Read, Write, Edit
---

Arguments: `$ARGUMENTS`

Load the `qa` skill (`.agents/skills/qa/SKILL.md`) and follow it. This command only picks the
script. (`/dxos:qa` is the sibling for `flow QA-n` blocks in `.mdl` specs.)

List the scripts (run this first):

```bash
ls -1 packages/apps/composer-app/testing/scripts/*.md | grep -v README.md | xargs -n1 basename | sed 's/\.md$//' | nl -w2 -s'. '
```

**If `$ARGUMENTS` is empty**, show that numbered list with each script's chapter titles
(`grep -h '^## Chapter' <file>`) and ask which one to run — a number, a name, or `<name> <chapter>`.
Stop there; do not start a server until the user has picked.

**If `$ARGUMENTS` names a script** (by number or name, optionally followed by a chapter number),
read it and the scripts README, then run the named chapter (all chapters when none is given) exactly
as the skill describes: start the QA server, install the harness, establish `Given`, run the steps,
drain errors after each, run `Teardown`, write the report, stop the server, and reply with the step
table and the report path.

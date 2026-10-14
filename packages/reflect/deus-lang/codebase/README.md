# https://dxos.org/deus/toolchain

A text export of a DEUS codebase (`deus export`, D64), kept in git as its backup. It is
generated: change the codebase, then export again.

- `code/` holds the source of every definition, one file per top-level namespace.
- `tasks.sexp` holds the tasks, and `TASKS.md` lists them to read.
- `HISTORY.md` lists the changes on the branch.

To restore it into a fresh codebase:

```bash
deus init --empty
deus add code
deus task import tasks.sexp
```

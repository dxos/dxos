# a DEUS codebase

A text export of a DEUS codebase (`deus export`, D64), kept in git as its backup. It is
generated: change the codebase, then export again.

- `code/` holds the source of every definition, one file per top-level namespace.
- `tasks.sexp` holds the tasks, and `TASKS.md` lists them to read.
- `history.sexp` holds the branch's changes, and `HISTORY.md` lists them to read.
- `specs/` holds the `.mdl` spec blocks, one document per name.

To restore it into a fresh codebase:

```bash
deus init --empty
deus add code specs
deus task import tasks.sexp
deus history import history.sexp
```

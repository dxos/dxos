---
description: Runs through the steps to make sure the PR is ready to be merged
---

1. Run local checks:

```bash
pnpm -w pre-ci
```

2. If local checks fail, fix the errors, and go to 1. (re-run checks)

3. If checks pass run

```bash
pnpm -w gh-action --verify --watch
```

Wait for command to complete. If it fails, fix the error and go back to step 1.

4. Only stop when 

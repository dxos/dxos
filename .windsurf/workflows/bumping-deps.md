---
description: When asked to do a dependency bump
---

1. Use npm-check-updates tool: (from root) `ncu -u --deep <...package names> #globs supported` (example: ncu -u --deep eslint "*eslint*"). This updates package json file but doesnt update the lockfile
2. Run pnpm install
3. If any peer deps issues arise try to resolve them. Use `pkg-inspect` script to query information about a package including peer dep compatibility.
4. Make sure to commit.
5. Follow the pull-request workflow and fix any project errors arising after package bump.
6. If you see a difficult error, create a summary for the user and break.
7. Open a pull-request (even if you have errors) with title `chore: Bump XXXX@VVVV`
8. Check if you have any uncommited or unpushed changes.
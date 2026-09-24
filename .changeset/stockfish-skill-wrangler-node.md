---
# multiple-changesets: found running the chess-MCP eval; the skill text is plugin-debug's, the eval is not
'@dxos/plugin-debug': patch
---

The chess template's Development skill says how to get a wrangler with `--temporary` in the sandbox: the sandbox runs Node 20, a plain install resolves to a wrangler that predates the flag, and a session that met that gave up on the deploy for want of a credential.

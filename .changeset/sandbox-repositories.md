---
'@dxos/plugin-sandbox': minor
---

Add `Repository`: a durable git repository on EDGE (Cloudflare Artifacts) with a file viewer showing branches, a file tree and commit history. A sandbox can have repositories attached (`repositories` on create, or `AttachRepository`); every command in it then has each one as a git remote with credentials already configured, so work moves between sandbox and repository with plain git.

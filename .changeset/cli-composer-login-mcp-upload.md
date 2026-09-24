---
'@dxos/plugin-client': minor
---

`dx account login --method composer [<composer-url>]` connects the CLI to the identity open in a Composer tab on the same machine. The CLI opens Composer with a loopback callback and a one-time code; once the user approves, Composer creates a known-public-key device invitation and hands it to the CLI, which joins without an auth-code prompt. `dx mcp serve` now exposes `createUpload`, the same contract as the hosted MCP server, so an agent can `curl` a local file into a space and turn it into a `File` with `file.createFromUpload`. The new `tasks.addArtifact` operation attaches such a file, or any object, to a task, and the task article lists its artifacts. Known-public-key invitation codes from `Identity.share` now carry the guest keypair; before, they failed authentication with `keypair missing in the invitation`.

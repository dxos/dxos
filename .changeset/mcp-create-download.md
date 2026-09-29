---
'@dxos/mcp-server': minor
'@dxos/plugin-file': minor
---

MCP hosts gain a `createDownload` tool: it returns a short-lived URL and a ready-to-run `curl` command that saves a file object from a space straight to disk, the reverse of `createUpload`. The GitHub skill is now served over MCP, and the Project, GitHub and File skills describe attaching pull requests and screenshots to tasks, checking in from outside Composer, working the task tree, and the upload and download flows.

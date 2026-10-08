---
'@dxos/plugin-search': minor
'@dxos/plugin-github': minor
---

The Cmd+K search dialog offers actions on the typed text above its results, contributed through the new `SearchCapabilities.QueryAction`. Pasting a GitHub pull request URL or typing `owner/repo#123` offers "Import owner/repo#123 from GitHub"; picking it imports the pull request into the current space and opens it.

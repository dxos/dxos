---
'@dxos/plugin-client': patch
---

Index work that lasts longer than a second shows in the status bar's progress meter, one entry per kind: "Migrating database" or "Updating database index" for migrations and rebuilds, "Catching up database index" for catch-up, and "Updating search index" for the full-text index. Each entry leaves the meter when its work ends.

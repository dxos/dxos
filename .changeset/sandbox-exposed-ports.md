---
'@dxos/plugin-sandbox': minor
---

Sandboxes on EDGE can serve what they build: `Exec` takes `background: true` to start a long-running command (a server) and return at once, and the new `ExposePort` operation publishes a port the container listens on at a public URL a browser loads without credentials. The plugin also contributes a Composer Plugin (Sandbox) project template, in which an agent builds the World Clock plugin in an EDGE sandbox against the host's own commit, serves the build from the container and offers the exposed manifest URL to load, so the demo runs against a deployed Composer. Multi-line commands now each write their own script file, so a background command is not overwritten by the next one. Local sandboxes report background commands and exposed ports as unsupported.

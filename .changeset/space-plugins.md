---
'@dxos/client-protocol': minor
'@dxos/plugin-registry': minor
---

A space declares the plugins it runs on its own properties: `space.properties.plugins`, a map of plugin NSID to the semver range the space accepts. Every member of a space sees the same set, and EDGE reads the map off the space when it runs an operation there. A space's settings section gains a Plugins panel for editing it; a space that names no plugins leaves each member running their own set, as before.

---
'@dxos/plugin-deck': patch
---

- plugin-deck: an in-app navigation opens a plank under the node id it already holds, so the projection no longer mounts a placeholder plank and then re-keys it — which remounted the plank and its companion on every document switch.
- plugin-deck: a plank and the place its companion sits are one container whether or not a companion is attached, so a companion arriving (or being toggled) resizes a seam that was already there instead of re-parenting the plank and rebuilding its editor.
- plugin-projects: a project's Sessions and Artifacts branches and everything under them are addressed by the `project` key, extending the project's own id (`project/<project>+sessions+<session>`), so opening one from the navtree no longer fails with "node has no URL binding".

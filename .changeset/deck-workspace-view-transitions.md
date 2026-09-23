---
'@dxos/react-ui': minor
---

Switching workspaces in the deck now runs as a view transition where the browser supports `document.startViewTransition`: the content area and the navigation sidebar crossfade to the new workspace, and a sidebar that expands with the switch morphs from its rail to its open box instead of sliding underneath the fade. Readers who prefer reduced motion see the switch as before.

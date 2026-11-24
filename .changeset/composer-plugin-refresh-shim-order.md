---
'@dxos/app-framework': patch
---

A plugin served from its Vite dev server loads when its entry imports JSX from another file. `composerPlugin` now installs the React Refresh shim from a module the entry imports first, so it runs before those files' preamble check; before, each one threw "@vitejs/plugin-react can't detect preamble".

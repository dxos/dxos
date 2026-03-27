---
name: dxos-plugins
description: >-
  Guide for creating, maintaining, and refactoring DXOS Composer plugins.
  Use when working on files in packages/plugins/, adding new plugins,
  refactoring plugin components/containers, writing storybooks for plugins,
  or wiring capabilities like react-surface or operation-resolver.
---

# DXOS Plugins

Read `packages/plugins/AGENTS.md` for the full guide, per-plugin status, observations, and task tracking.

Treat `plugin-kanban` as the exemplar — mirror its structure for new plugins.

## Build & Test

```bash
moon run <plugin>:build
moon run <plugin>:lint -- --fix
moon run <plugin>:test
moon run <plugin>:test-storybook
```

Check `moon.yml` in the plugin directory for available tasks.

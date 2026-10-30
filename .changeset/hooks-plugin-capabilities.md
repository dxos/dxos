---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

Lifecycle hooks are plugin capabilities (`AppCapabilities.HookDefinition`) instead of skill fields, and `Hook.SettingsAnnotation` on a space's properties or an agent's instructions turns each plugin's hooks on or off; space settings get an Assistant panel with one toggle per plugin. Breaking: `Skill.hooks`, `Skill.Hook`, `Skill.HookSpec`, `@dxos/assistant/SkillHooks` and the `begin-request` hook event are removed.

---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

Agents can delegate work to another agent: `Agent.delegate({ target: { kind: 'agent' } })` and the delegation skill's delegate-to-agent hand a request to that agent's session, which runs on its own permissions. Plugins can give a local chat's agent standing grants with `AssistantCapabilities.SessionGuard`, and the chat shows a call refused for want of a permission as denied rather than failed. `@dxos/permission` (grants, requirements and the permission check) is now published. A process can be spawned with an `authority` (a principal and its grants) instead of a guard: its children are held to it, it is persisted, so a rehydrated process keeps it, and `ProcessManager.grant` adds grants to a live process. Operations declare what they need with `Operation.requires`; `@dxos/permission`'s `Guard` module is removed.

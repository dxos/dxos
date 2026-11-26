---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

Agents can delegate work to another agent: `Agent.delegate({ target: { kind: 'agent' } })` and the delegation skill's delegate-to-agent hand a request to that agent's session, which runs on its own permissions. Processes now carry an `authority` (a principal and the grants it holds) instead of a guard: `Process.Guard`, `SpawnOptions.guard` and `@dxos/permission`'s `Guard` module are removed. A process's calls are held to its own authority and its ancestors', checked by compute-runtime's `Verifier`; authorities persist with the process, and `ProcessManager.grant` adds grants to a live one. A consentable call an authority refuses is put to a `Consent` service; in a chat, "Allow for this chat" grants the permission to the session. Operations declare what they need with `Operation.requires`, plugins give a chat's agent its authority with `AssistantCapabilities.SessionAuthority`, and the chat shows a refused call as denied rather than failed. `@dxos/permission` is now published.

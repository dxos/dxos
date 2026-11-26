---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

Agents can delegate work to another agent: `Agent.delegate({ target: { kind: 'agent' } })` and the delegation skill's delegate-to-agent hand a request to that agent's session, which runs on its own permissions; an ambiguous agent name is refused.

Processes now carry an `authority` (a principal and the grants it holds) instead of a guard: `Process.Guard`, `SpawnOptions.guard` and `@dxos/permission`'s `Guard` module are removed. Every call a process makes is held to its own authority and those it inherited, checked by compute-runtime's `Verifier`. Authorities persist with the process. `Process.Manager.grant` adds grants to a live process and to the copies its children inherited; the manager a process sees grants only to processes held to its own authorities, never to itself. Operations declare what they need with `Operation.requires`.

A consentable call an authority refuses is put to a `Consent` service, and a one-time consent covers only the requirement it was asked about. In a chat, "Allow for this chat" grants the permission to the session. Plugins give a chat's agent its authority with `AssistantCapabilities.SessionAuthority`. The chat shows a refused call as denied rather than failed, and offers Try again on a failed request. These permission APIs are experimental. `@dxos/permission` is now published.

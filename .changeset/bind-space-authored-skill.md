---
'@dxos/agent-runtime': patch
'@dxos/assistant': patch
'@dxos/plugin-assistant': patch
---

A skill authored in a space can now be bound to a chat. Such a skill has no registry key, and the
context binder dropped every keyless skill on the way in, so the picker's toggle did nothing at all:
the row never ticked and the conversation never saw the skill.

Keyless skills are now carried through the binder, and the picker addresses a skill by its object
rather than re-looking it up by registry key — which is what silently no-oped. A space copy of a
registry skill also now shadows the registry entry in the picker (it carries the user's edits, the
same precedence `Skill.resolveAnnotatedSkills` already applies), and toggling it off clears either
form from the conversation.

`AgentService.createSession` likewise binds a skill that is already in a database as-is and
references any other skill by its registry URI, instead of cloning it into the space through the
deprecated `Skill.upsert` — which threw outright on a space-authored skill and would have
substituted the pristine registry copy for a fork. Such a URI resolves through the database's own
registry, so the assistant test layer now seeds a skill there as well as into `Registry.Service`.

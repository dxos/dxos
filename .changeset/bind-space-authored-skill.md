---
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

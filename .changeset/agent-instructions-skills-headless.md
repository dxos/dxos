---
'@dxos/plugin-agent': minor
---

A new conversation with an agent starts with the skills its instructions name at that moment, rather than a copy of its first chat's skills, so editing an agent's skills reaches its next conversation; new agents can also enable further skills themselves partway through one, and get the Database skill, whose new `getObjectLink` tool returns a Composer link to an object for places that cannot follow an `echo://` reference. The Drawing, Presenter and Sheet skills and their operations now load in headless hosts such as workerd, where drawings are laid out without a rendered surface.

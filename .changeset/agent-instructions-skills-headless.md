---
'@dxos/assistant': minor
---

A chat's bindings now follow its instructions: each request binds the skills the instructions name and unbinds those removed from them since, so editing an agent's skills in its instructions form takes effect on its next turn. The Drawing, Presenter and Sheet skills and their operations also load in headless hosts such as workerd, where drawings are laid out without a rendered surface.

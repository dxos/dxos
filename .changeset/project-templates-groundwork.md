---
'@dxos/plugin-routine': minor
---

Add project templates: plugins can contribute pre-wired Project scaffolds (instructions, skills, standing context, starter routines) via a new template capability, and the routine instructions editor can now scope which fields it renders and writes back. The mailbox gains a "Set up project" action (Inbox Research with a sender-ledger starter routine), CRM contributes a sender-research project, and the brain plugin contributes a scheduled mailbox fact-analysis project. Routines created in a project's scope run with the project bound into their session so outputs can be filed into the project's artifacts.

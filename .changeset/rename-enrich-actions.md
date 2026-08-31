---
'@dxos/plugin-inbox': patch
---

Rename the overloaded `Enrich` actions. `Enrich` labelled four unrelated things, two of them on
adjacent toolbars: the CRM record and sender actions are now `Research` (matching the
`ResearchPerson` / `ResearchOrganization` operations they invoke, and signalling that the run goes
out to the web), `Enrich images` is now `Find images`, and the dead `view-mode-enriched` translation
key — unreachable, since view-mode labels derive from `VIEW_MODES` — is removed. Operation ids for
`EnrichImages` and `ResearchPerson` / `ResearchOrganization` are unchanged.

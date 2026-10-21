---
'@dxos/react-ui-form': patch
'@dxos/plugin-projects': patch
---

A form list field keeps every item it adds: before, adding a second item brought back the first one as it was first added (blank), so the form failed validation and stopped saving. Feature cards also take a status from their status icon, and each subfeature row from its own icon.

A feature's subfeatures are edited in its article as the card lists them: the status icon picks a status, the name is edited in place, and rows are removed or added in the list.

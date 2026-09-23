---
'@dxos/plugin-markdown': patch
---

Typing an object embed link into a document no longer replaces the plank with an error boundary: a link is claimed by its URL scheme alone, so the widget was handed every prefix of the URI on the way to a complete one and resolving `echo:` or `echo://<spaceId>` threw out of render. An incomplete URI now renders as editable source with an unresolved marker, in the document editor and in the assistant's message cards alike.

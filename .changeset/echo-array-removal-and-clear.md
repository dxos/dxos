---
'@dxos/react-ui-mosaic': patch
'@dxos/plugin-client': patch
---

Fix drag-and-drop losing an item, and restore the authentication code on device invitations. Reordering within a board column destroyed the dragged item and moving a kanban card to the uncategorized column did nothing, because both re-entered the ECHO array or property in a form its schema rejects after the removal had already committed. Adding a device asked the identity service to share with its default auth method, which is no authentication, so the host was never issued a code to read out and the panel fell back to showing only the QR code — leaving the invitation code as the sole factor.

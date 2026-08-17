---
'@dxos/plugin-client': patch
---

Restore the authentication code on device invitations. Adding a device asked the identity service to share with its default auth method, which is no authentication, so the host was never issued a code to read out and the panel fell back to showing only the QR code — leaving the invitation code as the sole factor. The panel now requests a shared secret explicitly, and shows the code once a guest connects.

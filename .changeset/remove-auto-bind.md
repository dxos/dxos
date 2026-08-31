---
'@dxos/plugin-connector': patch
---

Remove auto-connect. Creating a mailbox no longer binds it to an authorized account on its own — which silently pointed a second mailbox at an account already syncing one — so every binding is now made deliberately, through the Connect menu or by completing a sign-in.

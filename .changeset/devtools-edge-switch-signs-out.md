---
'@dxos/devtools': patch
---

Switching the EDGE environment in the devtools selector while signed in now asks to confirm with the log out dialog, signs out (deleting this device's identity and spaces), saves the new environment and reloads at the login screen. Before, the identity was carried to the new environment, whose hub had no account for it, so EDGE refused it and no agent was created.

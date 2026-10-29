---
'@dxos/plugin-inbox': patch
---

Mail sync on EDGE no longer stalls at the 60s invocation deadline: a Gmail or JMAP sync run stops taking new messages after 40 seconds, saves its position, and continues in a follow-up run. Storybook dialogs and popovers now show translated text, and the assistant plugin's chat details surface loads on request.

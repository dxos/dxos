---
'@dxos/plugin-inbox': patch
'@dxos/plugin-assistant': patch
---

**Triage inbox** and a message's magic-wand extractions (such as **Summary**) now show their progress in the mailbox's status bar under the email list, like sync and Analyze, and the bar clears when the run completes, fails or is cancelled.

Answering a permission request that nothing is waiting on any more now shows an error in the chat instead of doing nothing.

A reply the agent sends from a mailbox with no connected account now stays under the email as an unsent draft, and the error tells the agent it was saved but not sent.

---
'@dxos/plugin-inbox': patch
---

Related-message rows show the derived summary, falling back to the provider snippet and only then to
the subject. Once the section collapses a thread to one row the subject carries no information — every
row in a thread repeats the same `Re: …`. Summaries are read from the mailbox's annotation feed, so
rows improve as the summarization pipeline runs; snippet is set by both the Gmail and JMAP mappers, so
the middle rung is populated for synced mail immediately.

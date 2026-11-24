---
'@dxos/assistant': patch
---

Agent turns now state today's date (UTC) at the end of the system prompt, so the model no longer resolves a date given without a year, such as a milestone on "12 December", to a past year. `createSystemPrompt` no longer renders its own date and time line, and `SystemPromptOptions` drops `DATETIME`. The model-fixture matcher in `@dxos/ai/testing` ignores the date section, in both Effect prompts and Anthropic request bodies, so recorded conversations replay on any day.

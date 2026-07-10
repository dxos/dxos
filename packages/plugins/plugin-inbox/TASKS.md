# plugin-inbox — Tasks

## Mailbox reply & triage

Reply drafting plus signals to decide which messages are worth replying to.
`Message.properties` is an open `Record(String, Any)`, so per-message signals
can be recorded there without a schema change. The Gmail sync mapper
(`operations/google/gmail/mapper.ts`) has the raw headers at map time.

### Tasks

- [ ] **Operation to unsubscribe**
  - A DXOS Operation that unsubscribes from a message's list using the
    `List-Unsubscribe` header (mailto: or one-click HTTPS POST per RFC 8058,
    honoring `List-Unsubscribe-Post`).
  - Reads the signal recorded on `properties.listUnsubscribe` (see detection
    task); surfaced as a message action.
  - Network action → confirm before sending (see safety rules).
- [ ] **Auto/bulk detection → gate draft creation**
  - In the sync mapper, detect a no-reply sender (local-part `no-reply` /
    `donotreply` / …) and read the `List-Unsubscribe` header; record
    `properties.noReply` and `properties.listUnsubscribe`.
  - Shared `isReplyable(message)` helper (false when no-reply or unsubscribe
    present) to skip draft creation for bulk/automated mail.
- [ ] **User-editable Instructions object informs reply drafting**
  - ECHO type `{ text: markdown, skills?: Ref[] }`, edited via a Form, merged
    into the reply generator's system prompt (skills resolved to their prompt/
    tool contributions). Scope decision pending (per-mailbox vs per-space).
  - Draft prototype lives in `stories-brain` (`pipelines/draft.ts`); wire the
    Instructions input through it first.

### References

- Draft-reply benchmark + illocution (speech-act) classification: `packages/stories/stories-brain` (`pipelines/draft.ts`, `pipelines/questions.ts`).
- Sync stats + body-part coverage: `operations/google/gmail/sync.ts`.

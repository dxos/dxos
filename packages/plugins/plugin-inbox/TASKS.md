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
- [ ] **User-editable Instructions inform reply drafting**
  - Reuse the existing `@dxos/compute` `Instructions` type (`text` markdown +
    `skills` + `objects`) — do NOT define a new one. It is already used with
    Routines.
  - Add an optional `instructions: Ref(Instructions)` to the `Mailbox` schema so
    the user can select one shared Instructions across mailboxes or create a
    distinct one per mailbox (edited via a Form / object picker).
  - The reply generator reads `mailbox.instructions?.target` and merges its
    `text` + `skills` into the session/system prompt (skills resolved to their
    tool/prompt contributions, as Routines do).
  - Draft prototype lives in `stories-brain` (`pipelines/draft.ts`); thread an
    `instructions` string through it first, then wire the Mailbox ref.

### References

- Draft-reply benchmark + illocution (speech-act) classification: `packages/stories/stories-brain` (`pipelines/draft.ts`, `pipelines/questions.ts`).
- Sync stats + body-part coverage: `operations/google/gmail/sync.ts`.
